package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.AssetTransferHeaderRequest;
import com.bimlab.asset.dto.request.AssetTransferDecisionRequest;
import com.bimlab.asset.dto.response.AssetTransferHeaderResponse;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.AssetTransfer;
import com.bimlab.asset.model.AssetTransferConfirmation;
import com.bimlab.asset.model.AssetTransferDocument;
import com.bimlab.asset.model.AssetTransferHeader;
import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.repository.AssetDocumentRepository;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.AssetTransferConfirmationRepository;
import com.bimlab.asset.repository.AssetTransferDocumentRepository;
import com.bimlab.asset.repository.AssetTransferHeaderRepository;
import com.bimlab.asset.repository.AssetTransferRepository;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.storage.MinioService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssetTransferServiceTest {

    @Mock AssetTransferRepository assetTransfers;
    @Mock AssetTransferHeaderRepository assetTransferRepo;
    @Mock AssetTransferConfirmationRepository assetTransferConfirmations;
    @Mock AssetTransferDocumentRepository assetTransferDocuments;
    @Mock AssetItemRepository assets;
    @Mock AssetService assetService;
    @Mock AssetDocumentRepository assetDocuments;
    @Mock AuditLogService auditLogService;
    @Mock AssetAccessService access;
    @Mock MinioService minioService;
    @Mock AssetReferenceLookup references;

    @InjectMocks AssetTransferService service;

    @Test
    void createTransferPendingApproval_createsHeaderAndPendingLine() {
        AssetItem asset = AssetItem.builder()
                .id(1L)
                .assetCode("TS-001")
                .name("Laptop")
                .status(AssetStatus.IN_STOCK)
                .build();
        when(assetTransfers.findByAsset_IdInAndTransferHeader_Status(List.of(1L), "PENDING_APPROVAL"))
                .thenReturn(List.of());
        when(access.getCurrentUsername()).thenReturn("admin");
        when(access.getCurrentEmployeeId()).thenReturn(7L);
        when(assetTransferRepo.existsByTransferCode("PBG-1")).thenReturn(false);
        when(assetTransferRepo.save(any(AssetTransferHeader.class))).thenAnswer(inv -> {
            AssetTransferHeader header = inv.getArgument(0);
            header.setId(10L);
            return header;
        });
        when(assetTransferConfirmations.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(assets.findById(1L)).thenReturn(Optional.of(asset));
        when(assetTransfers.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        AssetTransferHeaderResponse response = service.createTransferPendingApproval(request("PBG-1", 1L));

        assertEquals("PENDING_APPROVAL", response.status());
        assertEquals("ASSIGN", response.transferType());
        assertEquals(1, response.lines().size());
        assertEquals("PENDING", response.lines().get(0).lineStatus());
        assertEquals("ASSIGNED", response.lines().get(0).statusAfter());
        verify(assets, never()).save(any());

        ArgumentCaptor<AssetTransferHeader> headerCaptor = ArgumentCaptor.forClass(AssetTransferHeader.class);
        verify(assetTransferRepo).save(headerCaptor.capture());
        assertEquals(7L, headerCaptor.getValue().getRequestedEmployeeId());
    }

    @Test
    void createTransferPendingApproval_rejectsDuplicateAssetInSameRequest() {
        AssetTransferHeaderRequest req = new AssetTransferHeaderRequest(
                "PBG-2",
                "Phiếu bàn giao",
                "ASSIGN",
                null,
                42L,
                null,
                null,
                null,
                null,
                null,
                null,
                LocalDate.of(2026, 5, 19),
                null,
                "Cấp phát",
                null,
                null,
                null,
                List.of(
                        new AssetTransferHeaderRequest.Line(1L, null, null, null),
                        new AssetTransferHeaderRequest.Line(1L, null, null, null)
                )
        );

        assertThrows(IllegalArgumentException.class, () -> service.createTransferPendingApproval(req));
        verify(assetTransferRepo, never()).save(any());
    }

    @Test
    void createTransferPendingApproval_rejectsAssetInAnotherPendingTransfer() {
        AssetItem asset = AssetItem.builder().id(1L).assetCode("TS-001").build();
        AssetTransfer pendingLine = AssetTransfer.builder().asset(asset).build();
        when(assetTransfers.findByAsset_IdInAndTransferHeader_Status(eq(List.of(1L)), eq("PENDING_APPROVAL")))
                .thenReturn(List.of(pendingLine));

        assertThrows(IllegalArgumentException.class, () -> service.createTransferPendingApproval(request("PBG-3", 1L)));
        verify(assetTransferRepo, never()).save(any());
    }

    @Test
    void createTransferPendingApproval_rejectsNonFutureTransferDate() {
        AssetTransferHeaderRequest baseRequest = request("PBG-4", 1L);
        AssetTransferHeaderRequest req = new AssetTransferHeaderRequest(
                baseRequest.transferCode(), baseRequest.title(), baseRequest.transferType(),
                baseRequest.fromEmployeeId(), baseRequest.toEmployeeId(),
                baseRequest.fromDepartmentId(), baseRequest.toDepartmentId(),
                baseRequest.fromSiteId(), baseRequest.toSiteId(),
                baseRequest.fromProjectId(), baseRequest.toProjectId(),
                LocalDate.now(), baseRequest.plannedHandoverAt(),
                baseRequest.reason(), baseRequest.note(), baseRequest.approverEmployeeIds(),
                baseRequest.documents(), baseRequest.lines()
        );

        assertThrows(IllegalArgumentException.class, () -> service.createTransferPendingApproval(req));
    }

    @Test
    void approveTransferHeader_updatesAssignedAndRevokedAssets() {
        AssetTransferHeader header = pendingHeader();
        AssetTransferConfirmation confirmation = AssetTransferConfirmation.builder()
                .id(20L)
                .transferHeader(header)
                .status("PENDING")
                .build();
        AssetItem assignedAsset = AssetItem.builder()
                .id(1L)
                .assetCode("TS-001")
                .status(AssetStatus.IN_STOCK)
                .build();
        AssetItem revokedAsset = AssetItem.builder()
                .id(2L)
                .assetCode("TS-002")
                .assignedEmployeeId(3L)
                .departmentId(4L)
                .siteId(5L)
                .projectId(6L)
                .status(AssetStatus.ASSIGNED)
                .build();
        AssetTransfer assignLine = AssetTransfer.builder()
                .id(30L)
                .transferHeader(header)
                .asset(assignedAsset)
                .transferType("ASSIGN")
                .toEmployeeId(7L)
                .toDepartmentId(8L)
                .toSiteId(9L)
                .toProjectId(10L)
                .statusAfter("ASSIGNED")
                .lineStatus("PENDING")
                .build();
        AssetTransfer revokeLine = AssetTransfer.builder()
                .id(31L)
                .transferHeader(header)
                .asset(revokedAsset)
                .transferType("REVOKE")
                .lineStatus("PENDING")
                .build();

        when(assetTransferRepo.findById(10L)).thenReturn(Optional.of(header));
        when(assetTransferConfirmations.findByTransferHeaderIdOrderByIdAsc(10L))
                .thenReturn(List.of(confirmation));
        when(access.hasAnyPermission(any(), any())).thenReturn(true);
        when(access.getCurrentEmployeeId()).thenReturn(null);
        when(access.getCurrentUsername()).thenReturn("approver");
        when(references.employeeName(null, "approver")).thenReturn("Người duyệt");
        when(assetTransferRepo.save(header)).thenReturn(header);
        when(assetTransferConfirmations.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(assetTransfers.findByTransferHeaderIdOrderByLineNoAscIdAsc(10L))
                .thenReturn(List.of(assignLine, revokeLine));
        when(assetTransfers.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(assetTransferDocuments.findByTransferHeaderIdOrderByIdAsc(10L)).thenReturn(List.of());

        AssetTransferHeaderResponse response = service.approveTransferHeader(
                10L, new AssetTransferDecisionRequest("Đồng ý", null));

        assertEquals("APPROVED", response.status());
        assertEquals("Người duyệt", response.approvedBy());
        assertEquals("APPROVED", confirmation.getStatus());
        assertEquals("APPROVED", assignLine.getLineStatus());
        assertEquals(7L, assignedAsset.getAssignedEmployeeId());
        assertEquals(8L, assignedAsset.getDepartmentId());
        assertEquals(9L, assignedAsset.getSiteId());
        assertEquals(10L, assignedAsset.getProjectId());
        assertEquals(header.getTransferDate(), assignedAsset.getUseDate());
        assertEquals(AssetStatus.ASSIGNED, assignedAsset.getStatus());
        assertEquals(null, revokedAsset.getAssignedEmployeeId());
        assertEquals(null, revokedAsset.getDepartmentId());
        assertEquals(null, revokedAsset.getProjectId());
        assertEquals(AssetStatus.IN_STOCK, revokedAsset.getStatus());
        verify(assets).save(assignedAsset);
        verify(assets).save(revokedAsset);
    }

    @Test
    void rejectTransferHeader_allowsAssignedApprover() {
        AssetTransferHeader header = pendingHeader();
        header.setNote("Ghi chú cũ");
        AssetTransferConfirmation confirmation = AssetTransferConfirmation.builder()
                .id(20L)
                .transferHeader(header)
                .confirmerEmployeeId(7L)
                .status("PENDING")
                .build();
        AssetTransfer line = AssetTransfer.builder()
                .id(30L)
                .transferHeader(header)
                .asset(AssetItem.builder().id(1L).assetCode("TS-001").build())
                .lineStatus("PENDING")
                .build();

        when(assetTransferRepo.findById(10L)).thenReturn(Optional.of(header));
        when(assetTransferConfirmations.findByTransferHeaderIdOrderByIdAsc(10L))
                .thenReturn(List.of(confirmation));
        when(access.getCurrentEmployeeId()).thenReturn(7L);
        when(access.getCurrentUsername()).thenReturn("reviewer");
        when(references.employeeName(7L, "reviewer")).thenReturn("Người từ chối");
        when(assetTransferRepo.save(header)).thenReturn(header);
        when(assetTransferConfirmations.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(assetTransfers.findByTransferHeaderIdOrderByLineNoAscIdAsc(10L)).thenReturn(List.of(line));
        when(assetTransfers.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(assetTransferDocuments.findByTransferHeaderIdOrderByIdAsc(10L)).thenReturn(List.of());

        AssetTransferHeaderResponse response = service.rejectTransferHeader(
                10L, new AssetTransferDecisionRequest("Sai thông tin", null));

        assertEquals("REJECTED", response.status());
        assertEquals("Người từ chối", response.approvedBy());
        assertEquals("Ghi chú cũ\nTừ chối: Sai thông tin", response.note());
        assertEquals("REJECTED", confirmation.getStatus());
        assertEquals("Sai thông tin", confirmation.getNote());
        assertEquals("REJECTED", line.getLineStatus());
    }

    @Test
    void cancelTransferHeader_allowsRequestOwner() {
        AssetTransferHeader header = pendingHeader();
        header.setRequestedEmployeeId(7L);
        AssetTransfer line = AssetTransfer.builder()
                .id(30L)
                .transferHeader(header)
                .asset(AssetItem.builder().id(1L).assetCode("TS-001").build())
                .lineStatus("PENDING")
                .build();

        when(assetTransferRepo.findById(10L)).thenReturn(Optional.of(header));
        when(access.getCurrentEmployeeId()).thenReturn(7L);
        when(access.getCurrentUsername()).thenReturn("requester");
        when(assetTransferRepo.save(header)).thenReturn(header);
        when(assetTransfers.findByTransferHeaderIdOrderByLineNoAscIdAsc(10L)).thenReturn(List.of(line));
        when(assetTransfers.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
        when(assetTransferConfirmations.findByTransferHeaderIdOrderByIdAsc(10L)).thenReturn(List.of());
        when(assetTransferDocuments.findByTransferHeaderIdOrderByIdAsc(10L)).thenReturn(List.of());

        AssetTransferHeaderResponse response = service.cancelTransferHeader(
                10L, new AssetTransferDecisionRequest("Không còn nhu cầu", null));

        assertEquals("CANCELLED", response.status());
        assertEquals("requester", response.cancelledBy());
        assertEquals("Không còn nhu cầu", response.cancelReason());
        assertEquals("CANCELLED", line.getLineStatus());
    }

    @Test
    void listTransferHeaders_loadsRelatedDataInBulk() {
        AssetTransferHeader header = pendingHeader();
        AssetItem asset = AssetItem.builder().id(1L).assetCode("TS-001").name("Laptop").build();
        AssetTransfer line = AssetTransfer.builder()
                .id(30L)
                .transferHeader(header)
                .asset(asset)
                .lineStatus("PENDING")
                .build();
        AssetTransferConfirmation confirmation = AssetTransferConfirmation.builder()
                .id(20L)
                .transferHeader(header)
                .confirmerEmployeeId(7L)
                .status("PENDING")
                .build();
        AssetTransferDocument document = AssetTransferDocument.builder()
                .id(40L)
                .transferHeader(header)
                .fileName("bien-ban.pdf")
                .objectKey("transfers/bien-ban.pdf")
                .build();

        when(assetTransferRepo.findAllByOrderByUpdatedAtDescIdDesc()).thenReturn(List.of(header));
        when(assetTransfers.findByTransferHeaderIdInOrderByTransferHeaderIdAscLineNoAscIdAsc(List.of(10L)))
                .thenReturn(List.of(line));
        when(assetTransferConfirmations.findByTransferHeaderIdInOrderByTransferHeaderIdAscIdAsc(List.of(10L)))
                .thenReturn(List.of(confirmation));
        when(assetTransferDocuments.findByTransferHeaderIdInOrderByTransferHeaderIdAscIdAsc(List.of(10L)))
                .thenReturn(List.of(document));
        when(minioService.getPresignedUrl("transfers/bien-ban.pdf")).thenReturn("https://files/bien-ban.pdf");

        List<AssetTransferHeaderResponse> responses = service.listTransferHeaders();

        assertEquals(1, responses.size());
        assertEquals("TS-001", responses.get(0).lines().get(0).assetCode());
        assertEquals(7L, responses.get(0).confirmations().get(0).confirmerEmployeeId());
        assertEquals("https://files/bien-ban.pdf", responses.get(0).documents().get(0).downloadUrl());
        verify(assetTransfers, never()).findByTransferHeaderIdOrderByLineNoAscIdAsc(10L);
    }

    private AssetTransferHeader pendingHeader() {
        return AssetTransferHeader.builder()
                .id(10L)
                .transferCode("PBG-10")
                .title("Phiếu bàn giao")
                .transferType("ASSIGN")
                .status("PENDING_APPROVAL")
                .transferDate(LocalDate.of(2026, 5, 19))
                .build();
    }

    private AssetTransferHeaderRequest request(String code, Long assetId) {
        return new AssetTransferHeaderRequest(
                code,
                "Phiếu bàn giao",
                "ASSIGN",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                LocalDate.now().plusDays(1),
                null,
                "Cấp phát",
                null,
                List.of(99L),
                null,
                List.of(new AssetTransferHeaderRequest.Line(assetId, "Tốt", null, "Ghi chú"))
        );
    }
}
