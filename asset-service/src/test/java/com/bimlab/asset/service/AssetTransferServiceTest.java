package com.bimlab.asset.service;


import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.dto.request.AssetTransferRequest;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.AssetTransfer;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.AssetTransferRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssetTransferServiceTest {

    @Mock AssetTransferRepository assetTransfers;
    @Mock AssetItemRepository assets;
    @Mock AssetService assetService;

    @InjectMocks AssetTransferService service;

    @Test
    void createTransfer_appliesToAssetWhenFlagSet() {
        AssetItem asset = AssetItem.builder().id(1L).assetCode("X").name("X").category("IT")
                .status(AssetStatus.IN_STOCK).assignedEmployeeId(null).build();
        when(assetService.getAsset(1L)).thenReturn(asset);
        when(assetTransfers.save(any(AssetTransfer.class))).thenAnswer(inv -> inv.getArgument(0));

        AssetTransferRequest req = new AssetTransferRequest(
                1L, "ASSIGN", null, 42L, null, null, null, null,
                LocalDate.of(2026, 5, 19), "Cấp cho nhân viên mới", "admin", null, true
        );
        AssetTransfer saved = service.createTransfer(req);

        assertEquals("ASSIGN", saved.getTransferType());
        assertEquals(42L, saved.getToEmployeeId());

        ArgumentCaptor<AssetItem> assetCaptor = ArgumentCaptor.forClass(AssetItem.class);
        verify(assets).save(assetCaptor.capture());
        assertEquals(42L, assetCaptor.getValue().getAssignedEmployeeId());
        assertEquals(AssetStatus.ASSIGNED, assetCaptor.getValue().getStatus());
    }

    @Test
    void createTransfer_doesNotTouchAssetWhenFlagFalse() {
        AssetItem asset = AssetItem.builder().id(1L).status(AssetStatus.ASSIGNED).assignedEmployeeId(10L).build();
        when(assetService.getAsset(1L)).thenReturn(asset);
        when(assetTransfers.save(any(AssetTransfer.class))).thenAnswer(inv -> inv.getArgument(0));

        AssetTransferRequest req = new AssetTransferRequest(
                1L, "ASSIGN", null, 42L, null, null, null, null,
                LocalDate.now(), null, null, null, false
        );
        service.createTransfer(req);

        verify(assets, never()).save(any());
    }

    @Test
    void revokeTransfer_setsStatusInStock() {
        AssetItem asset = AssetItem.builder().id(1L).status(AssetStatus.ASSIGNED).assignedEmployeeId(42L).build();
        when(assetService.getAsset(1L)).thenReturn(asset);
        when(assetTransfers.save(any(AssetTransfer.class))).thenAnswer(inv -> inv.getArgument(0));

        AssetTransferRequest req = new AssetTransferRequest(
                1L, "REVOKE", 42L, null, null, null, null, null,
                LocalDate.now(), "Thu hồi vì nghỉ việc", "admin", null, true
        );
        service.createTransfer(req);

        ArgumentCaptor<AssetItem> captor = ArgumentCaptor.forClass(AssetItem.class);
        verify(assets).save(captor.capture());
        assertEquals(AssetStatus.IN_STOCK, captor.getValue().getStatus());
        assertNull(captor.getValue().getAssignedEmployeeId());
    }
}
