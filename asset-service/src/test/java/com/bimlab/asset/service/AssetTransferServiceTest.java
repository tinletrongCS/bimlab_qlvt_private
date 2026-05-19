package com.bimlab.asset.service;

import com.bimlab.asset.dto.AssetTransferRequest;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.AssetTransfer;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.AssetTransferRepository;
import com.bimlab.asset.repository.PurchaseRequestRepository;
import com.bimlab.asset.repository.SubscriptionRepository;
import com.bimlab.asset.repository.VendorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssetTransferServiceTest {

    @Mock VendorRepository vendors;
    @Mock AssetItemRepository assets;
    @Mock SubscriptionRepository subscriptions;
    @Mock PurchaseRequestRepository purchaseRequests;
    @Mock AssetTransferRepository assetTransfers;

    @InjectMocks AssetManagementService service;

    @Test
    void createTransfer_appliesToAssetWhenFlagSet() {
        AssetItem asset = AssetItem.builder().id(1L).assetCode("X").name("X").category("IT")
                .status("IN_STOCK").assignedEmployeeId(null).build();
        when(assets.findById(1L)).thenReturn(Optional.of(asset));
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
        assertEquals("ASSIGNED", assetCaptor.getValue().getStatus());
    }

    @Test
    void createTransfer_doesNotTouchAssetWhenFlagFalse() {
        AssetItem asset = AssetItem.builder().id(1L).status("ASSIGNED").assignedEmployeeId(10L).build();
        when(assets.findById(1L)).thenReturn(Optional.of(asset));
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
        AssetItem asset = AssetItem.builder().id(1L).status("ASSIGNED").assignedEmployeeId(42L).build();
        when(assets.findById(1L)).thenReturn(Optional.of(asset));
        when(assetTransfers.save(any(AssetTransfer.class))).thenAnswer(inv -> inv.getArgument(0));

        AssetTransferRequest req = new AssetTransferRequest(
                1L, "REVOKE", 42L, null, null, null, null, null,
                LocalDate.now(), "Thu hồi vì nghỉ việc", "admin", null, true
        );
        service.createTransfer(req);

        ArgumentCaptor<AssetItem> captor = ArgumentCaptor.forClass(AssetItem.class);
        verify(assets).save(captor.capture());
        assertEquals("IN_STOCK", captor.getValue().getStatus());
        assertNull(captor.getValue().getAssignedEmployeeId());
    }
}
