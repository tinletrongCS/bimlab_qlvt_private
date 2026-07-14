package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.AssetTransferRequest;
import com.bimlab.asset.model.AssetDocument;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.AssetTransfer;
import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.AssetDocumentRepository;
import com.bimlab.asset.repository.AssetTransferRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * {@link #createTransfer} writes the transfer and parent asset assignment under
 * one {@code @Transactional} boundary. The asset write uses
 * {@link AssetItemRepository} directly to remain in that transaction.
 */
@Service
@RequiredArgsConstructor
public class AssetTransferService {
    private final AssetTransferRepository assetTransfers;
    private final AssetItemRepository assets;
    private final AssetService assetService;
    private final AssetDocumentRepository assetDocuments;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<AssetTransfer> listTransfers() {
        return assetTransfers.findAllSortedByDateDesc();
    }

    @Transactional(readOnly = true)
    public Page<AssetTransfer> listTransfersPaged(Pageable pageable) {
        return assetTransfers.findAll(pageable);
    }
    @Transactional(readOnly = true)
    public List<AssetTransfer> listTransfersByAsset(Long assetId) {
        return assetTransfers.findByAssetIdOrderByTransferDateDesc(assetId);
    }

    @Transactional(readOnly = true)
    public AssetTransfer getTransfer(Long id) {
        return assetTransfers.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy bản ghi bàn giao tài sản."));
    }

    @Transactional
    public AssetTransfer createTransfer(AssetTransferRequest req) {
        // Lưu ý: ghi 1 log cho phiếu tài sản
        // 1 log cho cho mỗi tài sản: TRANSFER_LINE_ADDED, entity_type = ASSET
        AssetItem asset = assetService.getAsset(req.assetId());

        AssetDocument document = null;
        if (req.handoverDocumentId() != null) {
            document = assetDocuments.findById(req.handoverDocumentId())
                    .orElseThrow(() -> new NoSuchElementException(
                            "Không tìm thấy biên bản/hợp đồng với id: " + req.handoverDocumentId()
                    ));
        }

        AssetTransfer assetTransfer = AssetTransfer.builder()
                .asset(asset)
                .transferType(req.transferType())
                .fromEmployeeId(req.fromEmployeeId())
                .toEmployeeId(req.toEmployeeId())
                .fromDepartmentId(req.fromDepartmentId())
                .toDepartmentId(req.toDepartmentId())
                .fromSiteId(req.fromSiteId())
                .toSiteId(req.toSiteId())
                .fromProjectId(req.fromProjectId())
                .toProjectId(req.toProjectId())
                .transferDate(req.transferDate())
                .conditionBefore(req.conditionBefore())
                .conditionAfter(req.conditionAfter())
                .reason(req.reason())
                .handoverDocumentUrl(req.handoverDocumentUrl())
                .handoverDocument(document)
                .performedBy(req.performedBy())
                .approvedBy(req.approvedBy())
                .build();

        AssetTransfer savedAssetTransfer = assetTransfers.save(assetTransfer);

        if (Boolean.TRUE.equals(req.applyToAsset())) {
            Map<String, Object> before = assetSnapshot(asset);

            asset.setAssignedEmployeeId(req.toEmployeeId());

            if (req.toDepartmentId() != null) {
                asset.setDepartmentId(req.toDepartmentId());
            }

            if (req.toSiteId() != null) {
                asset.setSiteId(req.toSiteId());
            }

            if (req.toProjectId() != null) {
                asset.setProjectId(req.toProjectId());
            }

            if (req.toEmployeeId() != null) {
                asset.setStatus(AssetStatus.ASSIGNED);
            } else if ("REVOKE".equals(req.transferType())) {
                asset.setStatus(AssetStatus.IN_STOCK);
            }

            assets.save(asset);
            auditLogService.log(
                    "ASSET_TRANSFER",
                    AuditLogService.ENTITY_ASSET,
                    asset.getId(),
                    asset.getAssetCode(),
                    "TRANSFER_APPLIED",
                    "Cập nhật thông tin cho tài sản " + asset.getAssetCode() + " sau khi bàn giao",
                    before,
                    assetSnapshot(asset),
                    changedFields(before, assetSnapshot(asset))
            );
        }

        auditLogService.log(
                "ASSET_TRANSFER",
                AuditLogService.ENTITY_ASSET_TRANSFER,
                savedAssetTransfer.getId(),
                asset.getAssetCode(),
                "TRANSFER_CREATED",
                "Phiên bàn giao tài sản cho " + asset.getAssetCode() + " hoàn tất",
                null,
                transferSnapshot(savedAssetTransfer),
                null
        );

        return savedAssetTransfer;
    }

    @Transactional
    public void deleteTransfer(Long id) {
        AssetTransfer transfer = getTransfer(id);
        auditLogService.log(
                "ASSET_TRANSFER",
                AuditLogService.ENTITY_ASSET_TRANSFER,
                transfer.getId(),
                transfer.getAsset() == null ? null : transfer.getAsset().getAssetCode(),
                "TRANSFER_DELETED",
                "Xóa bản ghi bàn giao/luân chuyển",
                transferSnapshot(transfer),
                null,
                null
        );
        assetTransfers.delete(transfer);
    }

    private Map<String, Object> assetSnapshot(AssetItem asset) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("assignedEmployeeId", asset.getAssignedEmployeeId());
        data.put("departmentId", asset.getDepartmentId());
        data.put("siteId", asset.getSiteId());
        data.put("projectId", asset.getProjectId());
        data.put("status", asset.getStatus() == null ? null : asset.getStatus().name());
        return data;
    }

    private Map<String, Object> transferSnapshot(AssetTransfer transfer) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", transfer.getId());
        data.put("assetId", transfer.getAsset() == null ? null : transfer.getAsset().getId());
        data.put("transferType", transfer.getTransferType());
        data.put("fromEmployeeId", transfer.getFromEmployeeId());
        data.put("toEmployeeId", transfer.getToEmployeeId());
        data.put("fromDepartmentId", transfer.getFromDepartmentId());
        data.put("toDepartmentId", transfer.getToDepartmentId());
        data.put("fromSiteId", transfer.getFromSiteId());
        data.put("toSiteId", transfer.getToSiteId());
        data.put("fromProjectId", transfer.getFromProjectId());
        data.put("toProjectId", transfer.getToProjectId());
        data.put("transferDate", transfer.getTransferDate());
        return data;
    }

    private Map<String, Object> changedFields(Map<String, Object> before, Map<String, Object> after) {
        Map<String, Object> changed = new LinkedHashMap<>();
        after.forEach((key, value) -> {
            Object oldValue = before.get(key);
            if (!java.util.Objects.equals(oldValue, value)) {
                Map<String, Object> pair = new LinkedHashMap<>();
                pair.put("before", oldValue);
                pair.put("after", value);
                changed.put(key, pair);
            }
        });
        return changed;
    }
}
