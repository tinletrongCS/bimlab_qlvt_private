package com.bimlab.asset.service;

import com.bimlab.asset.dto.AssetTransferRequest;
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
import java.util.NoSuchElementException;

/**
 * Q2: AssetTransfer domain split from the original
 * {@code AssetManagementService}. Owns Transfer CRUD.
 *
 * <p>Transaction note (Q2 risk R1): {@link #createTransfer} writes BOTH the
 * transfer row AND (conditionally) the parent {@link AssetItem}'s
 * assignment fields under a single {@code @Transactional} boundary. We
 * inject {@link AssetItemRepository} directly for that write rather than
 * routing through {@link AssetService}, which keeps the existing
 * transactional behaviour identical to the pre-split monolith. Reading the
 * asset still routes through {@link AssetService#getAsset(Long)} for
 * consistent {@code NoSuchElementException} messaging.
 */
@Service
@RequiredArgsConstructor
public class AssetTransferService {
    private final AssetTransferRepository assetTransfers;
    private final AssetItemRepository assets;
    private final AssetService assetService;
    private final AssetDocumentRepository assetDocuments;

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
                .orElseThrow(() -> new NoSuchElementException("Bản ghi luân chuyển không tồn tại"));
    }

    @Transactional
    public AssetTransfer createTransfer(AssetTransferRequest req) {
        AssetItem asset = assetService.getAsset(req.assetId());
        AssetTransfer transfer = AssetTransfer.builder()
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
                .performedBy(req.performedBy())
                .handoverDocumentUrl(req.handoverDocumentUrl())
                .handoverDocument(req.handoverDocumentId() == null
                        ? null
                        : assetDocuments.findById(req.handoverDocumentId())
                                .orElseThrow(() -> new NoSuchElementException("Tài liệu bàn giao không tồn tại")))
                .approvedBy(req.approvedBy())
                .build();
        AssetTransfer saved = assetTransfers.save(transfer);

        if (Boolean.TRUE.equals(req.applyToAsset())) {
            asset.setAssignedEmployeeId(req.toEmployeeId());
            if (req.toDepartmentId() != null) asset.setDepartmentId(req.toDepartmentId());
            if (req.toSiteId() != null) asset.setSiteId(req.toSiteId());
            if (req.toProjectId() != null) asset.setProjectId(req.toProjectId());
            if (req.toEmployeeId() != null) asset.setStatus(AssetStatus.ASSIGNED);
            else if ("REVOKE".equals(req.transferType())) asset.setStatus(AssetStatus.IN_STOCK);
            assets.save(asset);
        }
        return saved;
    }

    @Transactional
    public void deleteTransfer(Long id) {
        assetTransfers.delete(getTransfer(id));
    }
}
