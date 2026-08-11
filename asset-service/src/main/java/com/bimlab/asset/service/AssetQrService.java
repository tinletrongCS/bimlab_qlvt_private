package com.bimlab.asset.service;

import com.bimlab.asset.dto.response.AssetQrIssueResponse;
import com.bimlab.asset.dto.response.AssetQrHistoryResponse;
import com.bimlab.asset.dto.response.AssetQrPublicResponse;
import com.bimlab.asset.entity.AuditLog;
import com.bimlab.asset.entity.AssetItem;
import com.bimlab.asset.entity.AssetQrCode;
import com.bimlab.asset.entity.AssetTransfer;
import com.bimlab.asset.entity.AssetTransferHeader;
import com.bimlab.asset.entity.status.QrCodeStatus;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.AssetQrCodeRepository;
import com.bimlab.asset.repository.AssetTransferRepository;
import com.bimlab.asset.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AssetQrService {
    private final AssetItemRepository assets;
    private final AssetQrCodeRepository qrCodes;
    private final AssetTransferRepository transfers;
    private final AuditLogRepository auditLogs;
    private final AssetReferenceLookup references;

    @Value("${asset.qr.public-page-url:https://qlvt.bimlab.com.vn/asset-qr.html}")
    private String publicPageUrl;

    @Transactional
    public AssetQrIssueResponse issue(Long assetId) {
        AssetItem asset = assets.findById(assetId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy tài sản"));
        AssetQrCode qrCode = qrCodes.findByAssetIdOrderByCreatedAtDesc(assetId).stream()
                .filter(item -> item.getStatus() == QrCodeStatus.ACTIVE)
                .findFirst()
                .orElseGet(() -> createQrCode(asset));
        String publicUrl = buildPublicUrl(qrCode.getQrToken());
        if (!publicUrl.equals(qrCode.getQrPayload())) {
            qrCode.setQrPayload(publicUrl);
            qrCodes.save(qrCode);
        }
        return new AssetQrIssueResponse(
                asset.getId(),
                asset.getAssetCode(),
                asset.getName(),
                qrCode.getQrToken(),
                publicUrl
        );
    }

    @Transactional(readOnly = true)
    public AssetQrPublicResponse getPublicAsset(String token) {
        AssetItem asset = findActiveAsset(token);
        List<AssetQrPublicResponse.TransferHistory> history = transfers
                .findByAssetIdOrderByTransferDateDesc(asset.getId()).stream()
                .filter(AssetQrService::isVisibleHistory)
                .map(AssetQrService::toHistory)
                .toList();
        return new AssetQrPublicResponse(
                asset.getAssetCode(),
                asset.getName(),
                asset.getStatus().name(),
                asset.getSerialNumber(),
                asset.getAssetCategory() != null ? asset.getAssetCategory().getName() : asset.getCategory(),
                asset.getAssetCategory() != null ? asset.getAssetCategory().getCode() : null,
                asset.getAssetClass().name(),
                asset.getTechnicalDescription(),
                asset.getAssignedEmployeeId(),
                references.employeeName(asset.getAssignedEmployeeId()),
                asset.getDepartmentId(),
                references.departmentName(asset.getDepartmentId()),
                asset.getSiteId(),
                references.siteName(asset.getSiteId()),
                asset.getProjectId(),
                asset.getUseDate(),
                asset.getPurchaseDate(),
                asset.getWarrantyUntil(),
                asset.getVendor() != null ? asset.getVendor().getName() : null,
                asset.getOriginalCost(),
                asset.getSource(),
                asset.getUpdatedAt(),
                history
        );
    }

    @Transactional(readOnly = true)
    public List<AssetQrHistoryResponse> getTransferHistory(String token) {
        AssetItem asset = findActiveAsset(token);

        // Chỉ hiển thị những bàn giao nào đã được duyệt (TRANSFER_APPROVED)
        List<AuditLog> approvedTransfers =
                auditLogs.findByEntityTypeAndEntityIdAndActionAndChangedFieldsIsNotNullOrderByOccurredAtDesc(
                        AuditLogService.ENTITY_TYPE_ASSET,
                        asset.getId(),
                        AuditLogService.ASSET_TRANSFER_APPROVED
                );

        // danh sách những lần bàn giao được duyệt + 1 slot cho lần khởi tạo đầu
        List<AssetQrHistoryResponse> history = new ArrayList<>(approvedTransfers.size() + 1);

        List<AssetQrHistoryResponse> qrHistoryResponses = approvedTransfers
                .stream()
                .map(this::approvedTransferToQrHistoryResponse)
                .toList();
        history.addAll(qrHistoryResponses);

        history.add(new AssetQrHistoryResponse(
                "ASSET_CREATED",
                "Khởi tạo hồ sơ tài sản",
                "Hồ sơ tài sản " + asset.getAssetCode() + " được tạo trên hệ thống.",
                asset.getCreatedAt(),
                null,
                null,
                Map.of(),
                Map.of(),
                Map.of()
        ));
        return history;
    }

    private AssetQrHistoryResponse approvedTransferToQrHistoryResponse(AuditLog log) {
        return new AssetQrHistoryResponse(
                AuditLogService.ASSET_TRANSFER_APPROVED,
                "Bàn giao tài sản",
                log.getSummary(),
                log.getOccurredAt(),
                references.employeeName(log.getActorEmployeeId(), log.getActorUsername()),
                log.getActorUsername(),
                withReferenceNames(log.getBeforeData()),
                withReferenceNames(log.getAfterData()),
                log.getChangedFields()
        );
    }

    private Map<String, Object> withReferenceNames(Map<String, Object> data) {
        if (data == null || data.isEmpty()) {
            return Map.of();
        }
        Map<String, Object> enriched = new LinkedHashMap<>(data);
        putIfPresent(enriched, "assignedEmployeeName",
                references.employeeName(asLong(data.get("assignedEmployeeId"))));
        putIfPresent(enriched, "departmentName",
                references.departmentName(asLong(data.get("departmentId"))));
        putIfPresent(enriched, "siteName",
                references.siteName(asLong(data.get("siteId"))));
        return enriched;
    }

    private static Long asLong(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private static void putIfPresent(Map<String, Object> data, String key, String value) {
        if (value != null && !value.isBlank()) {
            data.put(key, value);
        }
    }

    private AssetItem findActiveAsset(String token) {
        return qrCodes.findByQrToken(token)
                .filter(item -> item.getStatus() == QrCodeStatus.ACTIVE)
                .map(AssetQrCode::getAsset)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy mã QR"));
    }

    private AssetQrCode createQrCode(AssetItem asset) {
        String token = UUID.randomUUID().toString();
        return qrCodes.save(AssetQrCode.builder()
                .asset(asset)
                .qrToken(token)
                .qrPayload(buildPublicUrl(token))
                .status(QrCodeStatus.ACTIVE)
                .build());
    }

    private String buildPublicUrl(String token) {
        String pageUrl = publicPageUrl == null ? "" : publicPageUrl.trim();
        if (pageUrl.isBlank()
                || "null".equalsIgnoreCase(pageUrl)
                || pageUrl.matches("(?i)^https?://(localhost|127\\.0\\.0\\.1|\\[::1])(?::\\d+)?(?:/.*)?$")) {
            pageUrl = "https://qlvt.bimlab.com.vn/asset-qr.html";
        }
        String separator = pageUrl.contains("?") ? "&" : "?";
        return pageUrl + separator + "token=" + token;
    }

    private static boolean isVisibleHistory(AssetTransfer transfer) {
        if (!"COMPLETED".equals(transfer.getLineStatus())) {
            return false;
        }
        AssetTransferHeader header = transfer.getTransferHeader();
        return header == null || "APPROVED".equals(header.getStatus());
    }

    private static AssetQrPublicResponse.TransferHistory toHistory(AssetTransfer transfer) {
        AssetTransferHeader header = transfer.getTransferHeader();
        return new AssetQrPublicResponse.TransferHistory(
                header != null ? header.getTransferCode() : null,
                transfer.getTransferType(),
                header != null ? header.getStatus() : transfer.getLineStatus(),
                transfer.getTransferDate(),
                transfer.getFromEmployeeId(),
                transfer.getToEmployeeId(),
                transfer.getFromDepartmentId(),
                transfer.getToDepartmentId(),
                transfer.getFromSiteId(),
                transfer.getToSiteId(),
                transfer.getConditionBefore(),
                transfer.getConditionAfter()
        );
    }
}
