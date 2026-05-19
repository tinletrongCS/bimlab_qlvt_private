package com.bimlab.asset.service;

import com.bimlab.asset.dto.MaintenanceRecordRequest;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.MaintenanceRecord;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.MaintenanceRecordRepository;
import com.bimlab.asset.repository.PurchaseRequestRepository;
import com.bimlab.asset.repository.SubscriptionRepository;
import com.bimlab.asset.repository.VendorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MaintenanceServiceTest {

    @Mock VendorRepository vendors;
    @Mock AssetItemRepository assets;
    @Mock SubscriptionRepository subscriptions;
    @Mock PurchaseRequestRepository purchaseRequests;
    @Mock MaintenanceRecordRepository maintenanceRecords;

    @InjectMocks AssetManagementService service;

    @Test
    void createMaintenanceRecord_attachesAsset() {
        AssetItem asset = AssetItem.builder().id(1L).assetCode("LAP-1").name("X").category("IT").status("ASSIGNED").build();
        when(assets.findById(1L)).thenReturn(Optional.of(asset));
        when(maintenanceRecords.save(any(MaintenanceRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        MaintenanceRecordRequest req = new MaintenanceRecordRequest(
                1L, "REPAIR", LocalDate.of(2026, 5, 19), new BigDecimal("500000"),
                null, "Anh Tin", "Thay pin laptop", LocalDate.of(2027, 5, 19), null
        );
        MaintenanceRecord saved = service.createMaintenanceRecord(req);

        assertEquals(asset, saved.getAsset());
        assertEquals("REPAIR", saved.getMaintenanceType());
        assertEquals(new BigDecimal("500000"), saved.getCost());
    }

    @Test
    void warrantyExpiring_filtersAssetsInWindow() {
        AssetItem inWindow = AssetItem.builder().id(1L).warrantyUntil(LocalDate.now().plusDays(10)).status("ASSIGNED").build();
        AssetItem expired = AssetItem.builder().id(2L).warrantyUntil(LocalDate.now().minusDays(5)).status("ASSIGNED").build();
        AssetItem far = AssetItem.builder().id(3L).warrantyUntil(LocalDate.now().plusDays(60)).status("ASSIGNED").build();
        AssetItem disposed = AssetItem.builder().id(4L).warrantyUntil(LocalDate.now().plusDays(10)).status("DISPOSED").build();
        AssetItem noWarranty = AssetItem.builder().id(5L).status("ASSIGNED").build();
        when(assets.findAll()).thenReturn(List.of(inWindow, expired, far, disposed, noWarranty));

        List<AssetItem> expiring = service.listAssetsWithWarrantyExpiringWithin(30);

        assertEquals(1, expiring.size());
        assertEquals(1L, expiring.get(0).getId());
    }

    @Test
    void listMaintenanceByAsset_returnsDescendingByDate() {
        MaintenanceRecord a = MaintenanceRecord.builder().id(1L).maintenanceDate(LocalDate.of(2026, 5, 1)).build();
        MaintenanceRecord b = MaintenanceRecord.builder().id(2L).maintenanceDate(LocalDate.of(2026, 4, 1)).build();
        when(maintenanceRecords.findByAssetIdOrderByMaintenanceDateDesc(99L)).thenReturn(List.of(a, b));

        List<MaintenanceRecord> result = service.listMaintenanceByAsset(99L);

        assertEquals(2, result.size());
        assertEquals(1L, result.get(0).getId());
    }
}
