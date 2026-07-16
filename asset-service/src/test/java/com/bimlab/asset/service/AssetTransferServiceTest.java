package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.AssetTransferHeaderRequest;
import com.bimlab.asset.dto.response.AssetTransferHeaderResponse;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.AssetTransfer;
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
                LocalDate.of(2026, 5, 19),
                null,
                "Cấp phát",
                null,
                List.of(99L),
                null,
                List.of(new AssetTransferHeaderRequest.Line(assetId, "Tốt", null, "Ghi chú"))
        );
    }
}
