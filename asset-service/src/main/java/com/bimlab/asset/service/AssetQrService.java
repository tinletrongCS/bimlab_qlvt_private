package com.bimlab.asset.service;

import com.bimlab.asset.dto.response.AssetQrIssueResponse;
import com.bimlab.asset.dto.response.AssetQrPublicResponse;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.AssetQrCode;
import com.bimlab.asset.model.AssetTransfer;
import com.bimlab.asset.model.AssetTransferHeader;
import com.bimlab.asset.model.status.QrCodeStatus;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.AssetQrCodeRepository;
import com.bimlab.asset.repository.AssetTransferRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AssetQrService {
    private final AssetItemRepository assets;
    private final AssetQrCodeRepository qrCodes;
    private final AssetTransferRepository transfers;
    private final AssetReferenceLookup references;

    @Value("${asset.qr.public-page-url:http://localhost:3002/asset-qr.html}")
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
        AssetQrCode qrCode = qrCodes.findByQrToken(token)
                .filter(item -> item.getStatus() == QrCodeStatus.ACTIVE)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy mã QR"));
        AssetItem asset = qrCode.getAsset();
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
        if (pageUrl.isBlank() || "null".equalsIgnoreCase(pageUrl)) {
            pageUrl = "http://localhost:3002/asset-qr.html";
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
