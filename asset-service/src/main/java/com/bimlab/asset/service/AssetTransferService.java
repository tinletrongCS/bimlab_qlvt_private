package com.bimlab.asset.service;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import com.bimlab.asset.model.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bimlab.asset.dto.request.AssetTransferDecisionRequest;
import com.bimlab.asset.dto.request.AssetTransferHeaderRequest;
import com.bimlab.asset.dto.response.AssetTransferHeaderResponse;
import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.repository.AssetDocumentRepository;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.AssetTransferConfirmationRepository;
import com.bimlab.asset.repository.AssetTransferDocumentRepository;
import com.bimlab.asset.repository.AssetTransferHeaderRepository;
import com.bimlab.asset.repository.AssetTransferRepository;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.security.Permission;
import com.bimlab.asset.storage.MinioService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AssetTransferService {
    private final AssetTransferRepository assetTransfers;
    private final AssetTransferHeaderRepository assetTransferRepo;
    private final AssetTransferConfirmationRepository assetTransferConfirmations;
    private final AssetTransferDocumentRepository assetTransferDocuments;
    private final AssetItemRepository assets;
    private final AssetService assetService;
    private final AssetDocumentRepository assetDocuments;
    private final AuditLogService auditLogService;
    private final AssetAccessService access;
    private final MinioService minioService;
    private final AssetReferenceLookup references;
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
        List<AssetTransferConfirmation> confirmations = headerIds.isEmpty()
                ? List.of()
                : assetTransferConfirmations.findByTransferHeaderIdInOrderByTransferHeaderIdAscIdAsc(headerIds);
        List<AssetTransferDocument> documents = headerIds.isEmpty()
                ? List.of()
                : assetTransferDocuments.findByTransferHeaderIdInOrderByTransferHeaderIdAscIdAsc(headerIds);
        Map<Long, List<AssetTransfer>> linesByHeaderId = lines.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        line -> line.getTransferHeader().getId()
                ));
        Map<Long, List<AssetTransferConfirmation>> confirmationsByHeaderId = confirmations.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        confirmation -> confirmation.getTransferHeader().getId()
                ));
        Map<Long, List<AssetTransferDocument>> documentsByHeaderId = documents.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        document -> document.getTransferHeader().getId()
                ));
        return headers.stream()
                .map(header -> toResponse(
                        header,
                        linesByHeaderId.getOrDefault(header.getId(), List.of()),
                        confirmationsByHeaderId.getOrDefault(header.getId(), List.of()),
                        documentsByHeaderId.getOrDefault(header.getId(), List.of())
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
        if (req.transferDate() == null || !req.transferDate().isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("Ngày thực hiện phải sau ngày tạo phiếu");
        }
        LocalDate transferDate = req.transferDate();
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
        List<AssetTransferConfirmation> savedConfirmations = List.of();
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
            savedConfirmations = assetTransferConfirmations.saveAll(confirmations);
        }

        List<AssetTransferDocument> savedDocuments = List.of();
        if (req.documents() != null && !req.documents().isEmpty()) {
            List<AssetTransferDocument> documents = req.documents().stream()
                    .filter(document -> !isBlank(document.fileName()))
                    .map(document -> AssetTransferDocument.builder()
                            .transferHeader(savedHeader)
                            .documentType("ATTACHMENT")
                            .documentStatus("ACTIVE")
                            .fileName(document.fileName().trim())
                            .objectKey(isBlank(document.objectKey())
                                    ? "transfer-documents/" + savedHeader.getId() + "/" + UUID.randomUUID() + "_" + document.fileName().trim()
                                    : document.objectKey().trim())
                            .contentType(document.contentType())
                            .sizeBytes(document.sizeBytes())
                            .uploadedBy(requestedByUsername)
                            .build())
                    .toList();
            savedDocuments = assetTransferDocuments.saveAll(documents);
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

        return toResponse(savedHeader, savedLines, savedConfirmations, savedDocuments);
    }

    @Transactional
    public AssetTransferHeaderResponse approveTransferHeader(Long id, AssetTransferDecisionRequest req) {
        AssetTransferHeader header = assetTransferRepo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy phiếu bàn giao"));
        ensurePendingApproval(header);
        List<AssetTransferConfirmation> confirmations =
                assetTransferConfirmations.findByTransferHeaderIdOrderByIdAsc(header.getId());
        ensureCurrentUserCanDecide(confirmations);

        String username = access.getCurrentUsername();
        String approvedBy = actorLabel(references.employeeName(access.getCurrentEmployeeId()), username);
        Map<String, Object> beforeHeader = transferHeaderSnapshot(header);
        header.setStatus("APPROVED");
        header.setApprovedBy(approvedBy);
        AssetTransferHeader savedHeader = assetTransferRepo.save(header);

        confirmations.forEach(confirmation -> {
            confirmation.setStatus("APPROVED");
            confirmation.setConfirmedAt(LocalDateTime.now());
            confirmation.setNote(req == null ? null : req.reason());
        });
        List<AssetTransferConfirmation> savedConfirmations = assetTransferConfirmations.saveAll(confirmations);

        List<AssetTransfer> lines = assetTransfers.findByTransferHeaderIdOrderByLineNoAscIdAsc(header.getId());
        lines.forEach(line -> {
            AssetItem asset = line.getAsset();
            Map<String, Object> beforeAsset = assetSnapshot(asset);
            line.setLineStatus("APPROVED");
            line.setApprovedBy(approvedBy);
            applyApprovedTransfer(line, asset, header.getTransferDate());
            assets.save(asset);
            auditLogService.log(
                    "ASSET_TRANSFER",
                    AuditLogService.ENTITY_ASSET,
                    asset.getId(),
                    asset.getAssetCode(),
                    "TRANSFER_APPROVED",
                    "Duyệt phiếu bàn giao" + savedHeader.getTransferCode(),
                    beforeAsset,
                    assetSnapshot(asset),
                    changedFields(beforeAsset, assetSnapshot(asset))
            );
        });
        List<AssetTransfer> savedLines = assetTransfers.saveAll(lines);

        auditLogService.log(
                "ASSET_TRANSFER",
                AuditLogService.ENTITY_ASSET_TRANSFER_HEADER,
                savedHeader.getId(),
                savedHeader.getTransferCode(),
                "TRANSFER_APPROVED",
                "Duyệt phiếu bàn giao " + savedHeader.getTransferCode(),
                beforeHeader,
                transferHeaderSnapshot(savedHeader),
                changedFields(beforeHeader, transferHeaderSnapshot(savedHeader))
        );
        return toResponse(savedHeader, savedLines, savedConfirmations,
                assetTransferDocuments.findByTransferHeaderIdOrderByIdAsc(savedHeader.getId()));
    }

    @Transactional
    public AssetTransferHeaderResponse rejectTransferHeader(Long id, AssetTransferDecisionRequest req) {
        if (req == null || isBlank(req.reason())) {
            throw new IllegalArgumentException("Vui lòng nhập lý do từ chối");
        }
        AssetTransferHeader header = assetTransferRepo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy phiếu bàn giao"));
        ensurePendingApproval(header);
        List<AssetTransferConfirmation> confirmations =
                assetTransferConfirmations.findByTransferHeaderIdOrderByIdAsc(header.getId());
        ensureCurrentUserCanDecide(confirmations);

        Map<String, Object> beforeHeader = transferHeaderSnapshot(header);
        header.setStatus("REJECTED");
        header.setApprovedBy(actorLabel(
                references.employeeName(access.getCurrentEmployeeId()),
                access.getCurrentUsername()
        ));
        header.setNote(appendDecisionNote(header.getNote(), "Từ chối: " + req.reason()));
        AssetTransferHeader savedHeader = assetTransferRepo.save(header);

        LocalDateTime now = LocalDateTime.now();
        confirmations.forEach(confirmation -> {
            confirmation.setStatus("REJECTED");
            confirmation.setConfirmedAt(now);
            confirmation.setNote(req.reason());
        });
        List<AssetTransferConfirmation> savedConfirmations = assetTransferConfirmations.saveAll(confirmations);

        List<AssetTransfer> lines = assetTransfers.findByTransferHeaderIdOrderByLineNoAscIdAsc(header.getId());
        lines.forEach(line -> line.setLineStatus("REJECTED"));
        List<AssetTransfer> savedLines = assetTransfers.saveAll(lines);

        auditLogService.log(
                "ASSET_TRANSFER",
                AuditLogService.ENTITY_ASSET_TRANSFER_HEADER,
                savedHeader.getId(),
                savedHeader.getTransferCode(),
                "TRANSFER_REJECTED",
                "Từ chối phiếu bàn giao " + savedHeader.getTransferCode() + ": " + req.reason(),
                beforeHeader,
                transferHeaderSnapshot(savedHeader),
                changedFields(beforeHeader, transferHeaderSnapshot(savedHeader))
        );
        return toResponse(savedHeader, savedLines, savedConfirmations,
                assetTransferDocuments.findByTransferHeaderIdOrderByIdAsc(savedHeader.getId()));
    }

    @Transactional
    public AssetTransferHeaderResponse cancelTransferHeader(Long id, AssetTransferDecisionRequest req) {
        if (req == null || isBlank(req.reason())) {
            throw new IllegalArgumentException("Vui lòng nhập lý do hủy phiếu");
        }
        AssetTransferHeader header = assetTransferRepo.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy phiếu bàn giao"));
        ensurePendingApproval(header);
        boolean isOwner = java.util.Objects.equals(access.getCurrentEmployeeId(), header.getRequestedEmployeeId());
        if (!isOwner && !access.hasAnyPermission(Permission.ASSET_TRANSFERS_MANAGE, Permission.ASSET_MANAGE)) {
            throw new AccessDeniedException("Chỉ người tạo phiếu hoặc người quản lý bàn giao được hủy phiếu");
        }

        Map<String, Object> beforeHeader = transferHeaderSnapshot(header);
        header.setStatus("CANCELLED");
        header.setCancelledBy(access.getCurrentUsername());
        header.setCancelledAt(LocalDateTime.now());
        header.setCancelReason(req.reason());
        AssetTransferHeader savedHeader = assetTransferRepo.save(header);

        List<AssetTransfer> lines = assetTransfers.findByTransferHeaderIdOrderByLineNoAscIdAsc(header.getId());
        lines.forEach(line -> line.setLineStatus("CANCELLED"));
        List<AssetTransfer> savedLines = assetTransfers.saveAll(lines);

        auditLogService.log(
                "ASSET_TRANSFER",
                AuditLogService.ENTITY_ASSET_TRANSFER_HEADER,
                savedHeader.getId(),
                savedHeader.getTransferCode(),
                "TRANSFER_CANCELLED",
                "Hủy phiếu bàn giao " + savedHeader.getTransferCode() + ": " + req.reason(),
                beforeHeader,
                transferHeaderSnapshot(savedHeader),
                changedFields(beforeHeader, transferHeaderSnapshot(savedHeader))
        );
        return toResponse(savedHeader, savedLines,
                assetTransferConfirmations.findByTransferHeaderIdOrderByIdAsc(savedHeader.getId()),
                assetTransferDocuments.findByTransferHeaderIdOrderByIdAsc(savedHeader.getId()));
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
        if ("ASSIGN".equals(transferType) || toEmployeeId != null) {
            return AssetStatus.ASSIGNED.name();
        }
        return null;
    }

    // Dùng trong trường hợp muốn hủy 1 phiếu khi mà đã gửi
    // điều kiện là phiếu đó chưa được duyệt hoặc bị từ chối
    private void ensurePendingApproval(AssetTransferHeader header) {
        if (!"PENDING_APPROVAL".equals(header.getStatus())) {
            throw new IllegalStateException("Chỉ xử lý được phiếu đang chờ duyệt");
        }
    }

    private void ensureCurrentUserCanDecide(List<AssetTransferConfirmation> confirmations) {
        if (access.hasAnyPermission(Permission.ASSET_TRANSFERS_APPROVE, Permission.ASSET_MANAGE)) {
            return;
        }

        // lấy id của người mà được gán/chỉ định để xét duyệt 1 phiếu bàn giao
        Long currentEmployeeId = access.getCurrentEmployeeId();;
        boolean assignedApprover = currentEmployeeId != null && confirmations.stream()
                .anyMatch(item -> java.util.Objects.equals(item.getConfirmerEmployeeId(), currentEmployeeId));
        if (!assignedApprover) {
            throw new AccessDeniedException("Bạn không nằm trong danh sách người được xét duyệt phiếu này");
        }
    }

    private void applyApprovedTransfer(AssetTransfer line, AssetItem asset, LocalDate transferDate) {
        if ("REVOKE".equals(line.getTransferType())) {
            asset.setAssignedEmployeeId(null);
            asset.setDepartmentId(null);
            asset.setProjectId(null);
            asset.setStatus(AssetStatus.IN_STOCK);
            return;
        }
        asset.setAssignedEmployeeId(line.getToEmployeeId());
        asset.setDepartmentId(line.getToDepartmentId());
        asset.setSiteId(line.getToSiteId());
        asset.setProjectId(line.getToProjectId());
        if (transferDate != null) {
            asset.setUseDate(transferDate);
        }
        if (!isBlank(line.getStatusAfter())) {
            asset.setStatus(AssetStatus.valueOf(line.getStatusAfter()));
        }
    }

    private String appendDecisionNote(String currentNote, String decisionNote) {
        if (isBlank(currentNote)) {
            return decisionNote;
        }
        return currentNote + "\n" + decisionNote;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String actorLabel(String name, String username) {
        return isBlank(name) ? username : isBlank(username) ? name : name + " (" + username + ")";
    }

    private Map<String, Object> assetSnapshot(AssetItem asset) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("assignedEmployeeId", asset.getAssignedEmployeeId());
        data.put("departmentId", asset.getDepartmentId());
        data.put("siteId", asset.getSiteId());
        data.put("projectId", asset.getProjectId());
        data.put("useDate", asset.getUseDate());
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
            // nếu giá trị tại 1 key bị thay đổi so với giá trị ban đầu
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
        List<AssetTransferConfirmation> confirmations = transferHeader.getId() == null
                ? List.of()
                : assetTransferConfirmations.findByTransferHeaderIdOrderByIdAsc(transferHeader.getId());
        List<AssetTransferDocument> documents = transferHeader.getId() == null
                ? List.of()
                : assetTransferDocuments.findByTransferHeaderIdOrderByIdAsc(transferHeader.getId());
        return toResponse(transferHeader, lines, confirmations, documents);
    }

    private AssetTransferHeaderResponse toResponse(AssetTransferHeader transferHeader, List<AssetTransfer> lines) {
        List<AssetTransferConfirmation> confirmations = transferHeader.getId() == null
                ? List.of()
                : assetTransferConfirmations.findByTransferHeaderIdOrderByIdAsc(transferHeader.getId());
        List<AssetTransferDocument> documents = transferHeader.getId() == null
                ? List.of()
                : assetTransferDocuments.findByTransferHeaderIdOrderByIdAsc(transferHeader.getId());
        return toResponse(transferHeader, lines, confirmations, documents);
    }

    private AssetTransferHeaderResponse toResponse(
            AssetTransferHeader transferHeader,
            List<AssetTransfer> lines,
            List<AssetTransferConfirmation> confirmations,
            List<AssetTransferDocument> documents
    ) {
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
                transferHeader.getCreatedAt(),
                transferHeader.getReason(),
                transferHeader.getNote(),
                transferHeader.getRequestedBy(),
                transferHeader.getRequestedEmployeeId(),
                transferHeader.getApprovedBy(),
                transferHeader.getCancelledBy(),
                transferHeader.getCancelledAt(),
                transferHeader.getCancelReason(),
                confirmations.stream().map(this::toConfirmationResponse).toList(),
                documents.stream().map(this::toDocumentResponse).toList(),
                lines.stream().map(this::toLineResponse).toList()
        );
    }

    private AssetTransferHeaderResponse.Confirmation toConfirmationResponse(AssetTransferConfirmation confirmation) {
        return new AssetTransferHeaderResponse.Confirmation(
                confirmation.getId(),
                confirmation.getConfirmerEmployeeId(),
                confirmation.getConfirmerUsername(),
                confirmation.getConfirmerName(),
                confirmation.getConfirmationRole(),
                confirmation.getStatus(),
                confirmation.getConfirmedAt(),
                confirmation.getNote()
        );
    }

    private AssetTransferHeaderResponse.Document toDocumentResponse(AssetTransferDocument document) {
        return new AssetTransferHeaderResponse.Document(
                document.getId(),
                document.getDocumentType(),
                document.getDocumentStatus(),
                document.getFileName(),
                document.getObjectKey(),
                minioService.getPresignedUrl(document.getObjectKey()),
                document.getContentType(),
                document.getSizeBytes()
        );
    }

    // Map model dòng tài sản sang DTO response
    private AssetTransferHeaderResponse.Line toLineResponse(AssetTransfer transfer) {
        AssetItem asset = transfer.getAsset();
        return new AssetTransferHeaderResponse.Line(
                transfer.getId(),
                asset == null ? null : asset.getId(),
                asset == null ? null : asset.getAssetCode(),
                asset == null ? null : asset.getName(),
                transfer.getLineStatus(),
                transfer.getFromEmployeeId(),
                transfer.getToEmployeeId(),
                transfer.getFromDepartmentId(),
                transfer.getToDepartmentId(),
                transfer.getFromSiteId(),
                transfer.getToSiteId(),
                transfer.getFromProjectId(),
                transfer.getToProjectId(),
                transfer.getStatusBefore(),
                transfer.getStatusAfter(),
                transfer.getConditionBefore(),
                transfer.getBookValueAtTransfer(),
                transfer.getReceiverNote()
        );
    }
}
