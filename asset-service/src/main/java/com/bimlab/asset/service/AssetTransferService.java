package com.bimlab.asset.service;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicInteger;

import com.bimlab.asset.model.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bimlab.asset.dto.request.AssetTransferDecisionRequest;
import com.bimlab.asset.dto.request.AssetTransferHeaderRequest;
import com.bimlab.asset.dto.request.AssetTransferRequest;
import com.bimlab.asset.dto.response.AssetTransferHeaderResponse;
import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.repository.AssetDocumentRepository;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.AssetTransferConfirmationRepository;
import com.bimlab.asset.repository.AssetTransferHeaderRepository;
import com.bimlab.asset.repository.AssetTransferRepository;
import com.bimlab.asset.security.AssetAccessService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AssetTransferService {
    private final AssetTransferRepository assetTransfers;
    private final AssetTransferHeaderRepository assetTransferRepo;
    private final AssetTransferConfirmationRepository assetTransferConfirmations;
    private final AssetItemRepository assets;
    private final AssetService assetService;
    private final AssetDocumentRepository assetDocuments;
    private final AuditLogService auditLogService;
    private final AssetAccessService access;
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
//        return transferHeaders.findAllByOrderByUpdatedAtDescIdDesc()
//                .stream()
//                .map(this::toResponse)
//                .toList(); ->> bị N + 1 query
        List<AssetTransferHeader> headers = assetTransferRepo.findAllByOrderByUpdatedAtDescIdDesc();
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
    public Page<AssetTransferHeaderResponse> listTransferHeadersPaged(Pageable pageable) {
        return assetTransferRepo.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public AssetTransferHeaderResponse getTransferHeader(Long id) {
        AssetTransferHeader assetTransferHeader = assetTransferRepo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy phiếu bàn giao"));

        // Load các dòng asset_transfers thuộc phiếu
        List<AssetTransfer> lines = assetTransfers.findByTransferHeaderIdOrderByLineNoAscIdAsc(id);
        return toResponse(assetTransferHeader, lines);
    }

    @Transactional
    public AssetTransferHeaderResponse createTransferPendingApproval(AssetTransferHeaderRequest req) {
        if (req.lines() == null || req.lines().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn ít nhất 1 tài sản để bàn giao");
        }
        List<Long> requestedAssetIds = req.lines().stream()
                .map(AssetTransferHeaderRequest.Line::assetId)
                .toList();
        if (requestedAssetIds.stream().anyMatch(java.util.Objects::isNull)) {
            throw new IllegalArgumentException("Dòng tài sản bàn giao phải có assetId");
        }
        Set<Long> uniqueAssetIds = new LinkedHashSet<>(requestedAssetIds);
        if (uniqueAssetIds.size() != requestedAssetIds.size()) {
            throw new IllegalArgumentException("Một tài sản không được chọn nhiều lần trong cùng phiếu");
        }
        List<AssetTransfer> pendingLines = assetTransfers.findByAsset_IdInAndTransferHeader_Status(
                List.copyOf(uniqueAssetIds),
                "PENDING_APPROVAL"
        );
        if (!pendingLines.isEmpty()) {
            String assetCodes = pendingLines.stream()
                    .map(line -> line.getAsset() == null ? null : line.getAsset().getAssetCode())
                    .filter(code -> code != null && !code.isBlank())
                    .distinct()
                    .reduce((left, right) -> left + ", " + right)
                    .orElse("không xác định");
            throw new IllegalArgumentException("Tài sản đang nằm trong phiếu chờ duyệt khác: " + assetCodes);
        }

        String transferType = normalizeTransferType(req.transferType());
        LocalDate transferDate = req.transferDate() == null ? LocalDate.now() : req.transferDate();
        String requestedByUsername = access.getCurrentUsername();
        Long requestedEmployeeId = access.getCurrentEmployeeId();

        AssetTransferHeader assetTransferHeader = AssetTransferHeader.builder()
                .transferCode(resolveTransferCode(req.transferCode()))
                .title(isBlank(req.title()) ? defaultTransferTitle(transferType) : req.title().trim())
                .transferType(transferType)
                .status("PENDING_APPROVAL")
                .requestedBy(requestedByUsername)
                .requestedEmployeeId(requestedEmployeeId)
                .fromEmployeeId(req.fromEmployeeId())
                .toEmployeeId(req.toEmployeeId())
                .fromDepartmentId(req.fromDepartmentId())
                .toDepartmentId(req.toDepartmentId())
                .fromSiteId(req.fromSiteId())
                .toSiteId(req.toSiteId())
                .fromProjectId(req.fromProjectId())
                .toProjectId(req.toProjectId())
                .transferDate(transferDate)
                .plannedHandoverAt(req.plannedHandoverAt())
                .reason(req.reason())
                .note(req.note())
                .build();
        AssetTransferHeader savedHeader = assetTransferRepo.save(assetTransferHeader);
        /*
        Check xem phiếu này có bắt buộc cần người để phê duyệt ngoài admin hay không
        nếu không thì admin sẽ là người duyệt
        */
        if (req.approverEmployeeIds() != null && !req.approverEmployeeIds().isEmpty()) {
            List<AssetTransferConfirmation> confirmations = req.approverEmployeeIds().stream()
                    .filter(java.util.Objects::nonNull)
                    .distinct()
                    .map(employeeId -> AssetTransferConfirmation.builder()
                            .transferHeader(savedHeader)
                            .confirmationRole("MANAGER")
                            .confirmerEmployeeId(employeeId)
                            .status("PENDING")
                            .build())
                    .toList();
            assetTransferConfirmations.saveAll(confirmations);
        }

        AtomicInteger lineNo = new AtomicInteger(1);
        List<AssetTransfer> transferLines = req.lines().stream()
                .map(line -> {
                    AssetItem asset = assets.findById(line.assetId())
                            .orElseThrow(() -> new NoSuchElementException("Không tìm thấy tài sản với id " + line.assetId()
                            ));
                    return AssetTransfer.builder()
                            .transferHeader(savedHeader)
                            .asset(asset)
                            .lineNo(lineNo.getAndIncrement())
                            .transferType(transferType)
                            .fromEmployeeId(asset.getAssignedEmployeeId())
                            .toEmployeeId(req.toEmployeeId())
                            .fromDepartmentId(asset.getDepartmentId())
                            .toDepartmentId(req.toDepartmentId())
                            .fromSiteId(asset.getSiteId())
                            .toSiteId(req.toSiteId())
                            .fromProjectId(asset.getProjectId())
                            .toProjectId(req.toProjectId())
                            .transferDate(transferDate)
                            .lineStatus("PENDING")
                            .statusBefore(asset.getStatus() == null ? null : asset.getStatus().name())
                            .statusAfter(expectedStatusAfter(transferType, req.toEmployeeId()))
                            .conditionBefore(line.conditionBefore())
                            .bookValueAtTransfer(line.bookValueAtTransfer())
                            .receiverNote(line.receiverNote())
                            .reason(req.reason())
                            .build();
                }).toList();
        List<AssetTransfer> savedLines = assetTransfers.saveAll(transferLines);

        auditLogService.log(
                "ASSET_TRANSFER",
                AuditLogService.ENTITY_ASSET_TRANSFER_HEADER,
                savedHeader.getId(),
                savedHeader.getTransferCode(),
                "TRANSFER_SUBMITTED",
                "Gửi phiếu bàn giao " + savedHeader.getTransferCode() + " sang trạng thái chờ duyệt",
                null,
                transferHeaderSnapshot(savedHeader),
                null
        );
        savedLines.forEach(line -> auditLogService.log(
                "ASSET_TRANSFER",
                AuditLogService.ENTITY_ASSET,
                line.getAsset().getId(),
                line.getAsset().getAssetCode(),
                "TRANSFER_LINE_ADDED",
                "Thêm tài sản " + line.getAsset().getAssetCode() + " vào phiếu " + savedHeader.getTransferCode(),
                null,
                transferSnapshot(line),
                null
        ));

        return toResponse(savedHeader, savedLines);
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
        // - Chỉ cho cancel khi status = PENDING_APPROVAL.
        // - Validate req.reason() không rỗng.
        // - Check quyền: chỉ cho cancel nếu current user có asset_transfers_manage
        //   và currentEmployeeId == transferHeader.requestedEmployeeId.
        // - Controller chỉ nên hiện nút Hủy cho người đã tạo phiếu đang PENDING_APPROVAL.
        // - Nếu sau này cần admin override thì check thêm asset_manage/admin riêng, không mở mặc định.
        // - Đổi header status = CANCELLED.
        // - Set cancelReason, cancelledBy, cancelledAt.
        // - Đổi từng lineStatus = CANCELLED.
        // - Không cập nhật asset.assets.
        // - Ghi audit log phiếu: TRANSFER_CANCELLED.
        // - Return AssetTransferHeaderResponse.
        throw new UnsupportedOperationException("TODO: cancel transfer header");
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

    private String normalizeTransferType(String transferType) {
        if (isBlank(transferType)) {
            throw new IllegalArgumentException("Vui lòng chọn phân loại bàn giao");
        }
        return switch (transferType.trim()) {
            case "Bàn giao", "Cấp phát", "ASSIGN" -> "ASSIGN";
            case "Thu hồi", "REVOKE" -> "REVOKE";
            case "Điều chuyển", "TRANSFER" -> "TRANSFER";
            default -> transferType.trim();
        };
    }

    private String resolveTransferCode(String requestedCode) {
        if (!isBlank(requestedCode)) {
            String code = requestedCode.trim();
            if (assetTransferRepo.existsByTransferCode(code)) {
                throw new IllegalArgumentException("Mã phiếu bàn giao/ Số quyết định đã tồn tại: " + code);
            }
            return code;
        }
        String code;
        do {
            code = "PBG-" + System.currentTimeMillis();
        } while (assetTransferRepo.existsByTransferCode(code));
        return code;
    }

    private String defaultTransferTitle(String transferType) {
        return switch (transferType) {
            case "REVOKE" -> "Thu hồi tài sản";
            case "TRANSFER" -> "Điều chuyển tài sản";
            default -> "Bàn giao tài sản";
        };
    }

    private String expectedStatusAfter(String transferType, Long toEmployeeId) {
        if ("REVOKE".equals(transferType)) {
            return AssetStatus.IN_STOCK.name();
        }
        if (toEmployeeId != null) {
            return AssetStatus.ASSIGNED.name();
        }
        return null;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
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

    private Map<String, Object> transferHeaderSnapshot(AssetTransferHeader header) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", header.getId());
        data.put("transferCode", header.getTransferCode());
        data.put("transferType", header.getTransferType());
        data.put("status", header.getStatus());
        data.put("requestedBy", header.getRequestedBy());
        data.put("requestedEmployeeId", header.getRequestedEmployeeId());
        data.put("toEmployeeId", header.getToEmployeeId());
        data.put("toDepartmentId", header.getToDepartmentId());
        data.put("toSiteId", header.getToSiteId());
        data.put("toProjectId", header.getToProjectId());
        data.put("transferDate", header.getTransferDate());
        data.put("plannedHandoverAt", header.getPlannedHandoverAt());
        return data;
    }

    // theo từng dòng trong một cái phiếu
    private Map<String, Object> transferSnapshot(AssetTransfer transfer) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", transfer.getId());
        data.put("assetId", transfer.getAsset() == null ? null : transfer.getAsset().getId());
        data.put("transferHeaderId", transfer.getTransferHeader() == null ? null : transfer.getTransferHeader().getId());
        data.put("lineNo", transfer.getLineNo());
        data.put("lineStatus", transfer.getLineStatus());
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
        data.put("statusBefore", transfer.getStatusBefore());
        data.put("statusAfter", transfer.getStatusAfter());
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

    /*
    Các function map sang DTO response
     */
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
