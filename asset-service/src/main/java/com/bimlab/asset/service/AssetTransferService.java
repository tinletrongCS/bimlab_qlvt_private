package com.bimlab.asset.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

import com.bimlab.asset.model.AssetTransferHeader;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bimlab.asset.dto.request.AssetTransferDecisionRequest;
import com.bimlab.asset.dto.request.AssetTransferHeaderRequest;
import com.bimlab.asset.dto.request.AssetTransferRequest;
import com.bimlab.asset.dto.response.AssetTransferHeaderResponse;
import com.bimlab.asset.model.AssetDocument;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.AssetTransfer;
import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.repository.AssetDocumentRepository;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.AssetTransferHeaderRepository;
import com.bimlab.asset.repository.AssetTransferRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AssetTransferService {
    private final AssetTransferRepository assetTransfers;
    private final AssetTransferHeaderRepository assetTransferHeaders;
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

    @Transactional(readOnly = true)
    public List<AssetTransferHeaderResponse> listTransferHeaders() {
        // Liệt kê danh sách phiếu bàn giao theo luồng mới.
        // - Load asset_transfer_headers, ưu tiên sort createdAt/updatedAt desc.
        // - Load các dòng asset_transfers theo transferHeaderId.
        // - Map sang AssetTransferHeaderResponse.
//        return transferHeaders.findAllByOrderByUpdatedAtDescIdDesc()
//                .stream()
//                .map(this::toResponse)
//                .toList(); ->> bị N + 1 query
        List<AssetTransferHeader> headers = assetTransferHeaders.findAllByOrderByUpdatedAtDescIdDesc();
        List<Long> headerIds = headers.stream()
                .map(AssetTransferHeader::getId)
                .toList();
        List<AssetTransfer> lines = headerIds.isEmpty()
                ? List.of()
                : assetTransfers.findByTransferHeaderIdInOrderByTransferHeaderIdAscLineNoAscIdAsc(headerIds);
        Map<Long, List<AssetTransfer>> linesByHeaderId = lines.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        line -> line.getTransferHeader().getId()
                ));
        return headers.stream()
                .map(header -> toResponse(
                        header,
                        linesByHeaderId.getOrDefault(header.getId(), List.of())
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public AssetTransferHeaderResponse getTransferHeader(Long id) {
        // Xem chi tiết một phiếu bàn giao theo id.
        // - Tìm asset_transfer_headers theo id.
        // - Load các dòng asset_transfers thuộc phiếu.
        // - Map sang AssetTransferHeaderResponse.
        AssetTransferHeader assetTransferHeader = assetTransferHeaders.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy phiếu bàn giao"));

        // Load các dòng asset_transfers thuộc phiếu
        List<AssetTransfer> lines = assetTransfers.findByTransferHeaderIdOrderByLineNoAscIdAsc(id);
        return toResponse(assetTransferHeader, lines);
    }

    @Transactional
    public AssetTransferHeaderResponse createTransferDraft(AssetTransferHeaderRequest req) {
        // TODO PRACTICE TRANSFER 1:
        // Tạo phiếu bàn giao trạng thái DRAFT theo luồng mới.
        //
        // Yêu cầu:
        // - Validate req.lines() không rỗng.
        // - Tạo asset_transfer_headers với status = DRAFT.
        // - Set thông tin chung: mã phiếu, tiêu đề, transferType, lý do, ghi chú, transferDate, plannedHandoverAt.
        // - Set bên bàn giao/bên nhận: employee, department, site, project.
        // - requestedBy/requestedEmployeeId lấy từ user hiện tại, không lấy từ client.
        // - Với mỗi line: tìm AssetItem theo assetId, tạo asset_transfers gắn transferHeaderId.
        // - Snapshot trạng thái hiện tại của tài sản vào statusBefore.
        // - Set lineStatus = DRAFT, conditionBefore, bookValueAtTransfer, receiverNote.
        // - Chưa cập nhật bảng asset.assets ở bước này.
        // - Ghi audit log cho phiếu: TRANSFER_DRAFT_CREATED.
        // - Ghi audit log từng tài sản: TRANSFER_LINE_ADDED nếu cần.
        // - Return AssetTransferHeaderResponse.
        if (req.lines() == null || req.lines().isEmpty()) {
            throw new IllegalArgumentException("Tạo không thành công: phiếu bàn giao rỗng");
        }
        AssetTransferHeader assetTransferHeader = AssetTransferHeader.builder()
                .transferCode(req.transferCode())
                .title(req.title())
                .transferType(req.transferType())
                .status("DRAFT")
                .fromEmployeeId(req.fromEmployeeId())
                .toEmployeeId(req.toEmployeeId())
                .fromDepartmentId(req.fromDepartmentId())
                .toDepartmentId(req.toDepartmentId())
                .fromSiteId(req.fromSiteId())
                .toSiteId(req.toSiteId())
                .fromProjectId(req.fromProjectId())
                .toProjectId(req.toProjectId())
                .transferDate(req.transferDate())
                .plannedHandoverAt(req.plannedHandoverAt())
                .reason(req.reason())
                .note(req.note())
                .build();

        throw new UnsupportedOperationException("TODO: create transfer draft");
    }

    @Transactional
    public AssetTransferHeaderResponse submitTransferHeader(Long id) {
        // TODO PRACTICE TRANSFER 2:
        // Gửi phiếu bàn giao sang trạng thái chờ duyệt.
        //
        // Yêu cầu:
        // - Tìm asset_transfer_headers theo id.
        // - Chỉ cho submit khi status = DRAFT.
        // - Validate phiếu có ít nhất 1 dòng tài sản.
        // - Validate thông tin bắt buộc: bên nhận/bên giao phù hợp, reason, plannedHandoverAt.
        // - Đổi status: DRAFT -> PENDING_APPROVAL.
        // - updatedAt = now.
        // - Không cập nhật asset.assets.
        // - Ghi audit log phiếu: TRANSFER_SUBMITTED.
        // - Return AssetTransferHeaderResponse.
        throw new UnsupportedOperationException("TODO: submit transfer header");
    }

    @Transactional
    public AssetTransferHeaderResponse approveTransferHeader(Long id, AssetTransferDecisionRequest req) {
        // TODO PRACTICE TRANSFER 3:
        // Người có quyền asset_transfers_approve duyệt phiếu.
        //
        // Yêu cầu:
        // - Tìm asset_transfer_headers theo id.
        // - Chỉ cho approve khi status = PENDING_APPROVAL.
        // - Backend/controller phải kiểm tra quyền asset_transfers_approve.
        // - Đổi header status: PENDING_APPROVAL -> APPROVED.
        // - Set approvedBy từ user hiện tại, không lấy từ client.
        // - Với từng dòng asset_transfers:
        //   + lineStatus = APPROVED.
        //   + Tìm AssetItem tương ứng.
        //   + Snapshot beforeData trước khi cập nhật.
        //   + Cập nhật asset.assets theo bên nhận: employee, department, site, project, status.
        //   + Snapshot afterData sau khi cập nhật.
        //   + Ghi audit log entity_type = ASSET, action = TRANSFER_APPROVED.
        // - Ghi audit log phiếu entity_type = ASSET_TRANSFER_HEADER, action = TRANSFER_APPROVED.
        // - Toàn bộ chạy trong 1 transaction.
        // - Return AssetTransferHeaderResponse.
        throw new UnsupportedOperationException("TODO: approve transfer header");
    }

    @Transactional
    public AssetTransferHeaderResponse rejectTransferHeader(Long id, AssetTransferDecisionRequest req) {
        // TODO PRACTICE TRANSFER 4:
        // Người có quyền asset_transfers_approve từ chối phiếu.
        //
        // Yêu cầu:
        // - Tìm asset_transfer_headers theo id.
        // - Chỉ cho reject khi status = PENDING_APPROVAL.
        // - Validate req.reason() không rỗng.
        // - Đổi header status: PENDING_APPROVAL -> REJECTED.
        // - Đổi từng lineStatus = REJECTED.
        // - Không cập nhật asset.assets.
        // - Ghi audit log phiếu: TRANSFER_REJECTED, có lý do từ chối.
        // - Có thể ghi audit log từng tài sản nếu muốn hiện lịch sử bị từ chối.
        // - Return AssetTransferHeaderResponse.
        throw new UnsupportedOperationException("TODO: reject transfer header");
    }

    @Transactional
    public AssetTransferHeaderResponse cancelTransferHeader(Long id, AssetTransferDecisionRequest req) {
        // TODO PRACTICE TRANSFER 5:
        // Hủy phiếu bàn giao.
        //
        // Yêu cầu:
        // - Tìm asset_transfer_headers theo id.
        // - Chỉ cho cancel khi status = DRAFT hoặc PENDING_APPROVAL.
        // - Validate req.reason() không rỗng.
        // - Đổi header status = CANCELLED.
        // - Set cancelReason, cancelledBy, cancelledAt.
        // - Đổi từng lineStatus = CANCELLED.
        // - Không cập nhật asset.assets.
        // - Ghi audit log phiếu: TRANSFER_CANCELLED.
        // - Return AssetTransferHeaderResponse.
        throw new UnsupportedOperationException("TODO: cancel transfer header");
    }

    @Transactional
    public AssetTransfer createTransfer(AssetTransferRequest req) {
        // Lưu ý: ghi 1 log cho phiếu tài sản
        // 1 log cho cho mỗi tài sản: TRANSFER_LINE_ADDED, entity_type = ASSET
        AssetItem asset = assetService.getAsset(req.assetId());

//        AssetDocument document = null;
//        if (req.handoverDocumentId() != null) {
//            document = assetDocuments.findById(req.handoverDocumentId())
//                    .orElseThrow(() -> new NoSuchElementException(
//                            "Không tìm thấy biên bản/hợp đồng với id: " + req.handoverDocumentId()
//                    ));
//        }
        AssetDocument handover_document = null;
        if (req.handoverDocumentId() != null) {
            handover_document = assetDocuments.findById(req.handoverDocumentId())
                    .orElseThrow(() -> new NoSuchElementException("Không tìm thấy biên bản bàn giao " + req.handoverDocumentId() + " đính kèm với phiếu"));
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
                .handoverDocument(handover_document)
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

    // theo từng dòng trong một cái phiếu
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

    // API ghi lại ghi tiết các dòng đã bị thay đổi
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

    public AssetTransferHeaderResponse toResponse(AssetTransferHeader transferHeader) {
        List<AssetTransfer> lines = transferHeader.getId() == null
                ? List.of()
                : assetTransfers.findByTransferHeaderIdOrderByLineNoAscIdAsc(transferHeader.getId());
        return toResponse(transferHeader, lines);
    }

    private AssetTransferHeaderResponse toResponse(AssetTransferHeader transferHeader, List<AssetTransfer> lines) {
        return new AssetTransferHeaderResponse(
                transferHeader.getId(),
                transferHeader.getTransferCode(),
                transferHeader.getTitle(),
                transferHeader.getTransferType(),
                transferHeader.getStatus(),
                transferHeader.getFromEmployeeId(),
                transferHeader.getToEmployeeId(),
                transferHeader.getFromDepartmentId(),
                transferHeader.getToDepartmentId(),
                transferHeader.getFromSiteId(),
                transferHeader.getToSiteId(),
                transferHeader.getFromProjectId(),
                transferHeader.getToProjectId(),
                transferHeader.getTransferDate(),
                transferHeader.getPlannedHandoverAt(),
                transferHeader.getReason(),
                transferHeader.getNote(),
                lines.stream().map(this::toLineResponse).toList()
        );
    }

    private AssetTransferHeaderResponse.Line toLineResponse(AssetTransfer transfer) {
        AssetItem asset = transfer.getAsset();
        return new AssetTransferHeaderResponse.Line(
                transfer.getId(),
                asset == null ? null : asset.getId(),
                asset == null ? null : asset.getAssetCode(),
                asset == null ? null : asset.getName(),
                transfer.getLineStatus(),
                transfer.getStatusBefore(),
                transfer.getStatusAfter(),
                transfer.getConditionBefore(),
                transfer.getBookValueAtTransfer(),
                transfer.getReceiverNote()
        );
    }
}
