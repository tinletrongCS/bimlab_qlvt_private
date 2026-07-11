package com.bimlab.asset.service;


import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.dto.request.MaintenanceRecordRequest;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.MaintenanceRecord;
import com.bimlab.asset.repository.MaintenanceRecordRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MaintenanceServiceTest {

    @Mock MaintenanceRecordRepository maintenanceRecords;
    @Mock AssetService assetService;
    @Mock VendorService vendorService;

    @InjectMocks MaintenanceService service;

    @Test
    void createMaintenanceRecord_attachesAsset() {
        AssetItem asset = AssetItem.builder().id(1L).assetCode("LAP-1").name("X").category("IT").status(AssetStatus.ASSIGNED).build();
        when(assetService.getAsset(1L)).thenReturn(asset);
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
    void listMaintenanceByAsset_returnsDescendingByDate() {
        MaintenanceRecord a = MaintenanceRecord.builder().id(1L).maintenanceDate(LocalDate.of(2026, 5, 1)).build();
        MaintenanceRecord b = MaintenanceRecord.builder().id(2L).maintenanceDate(LocalDate.of(2026, 4, 1)).build();
        when(maintenanceRecords.findByAssetIdOrderByMaintenanceDateDesc(99L)).thenReturn(List.of(a, b));

        List<MaintenanceRecord> result = service.listMaintenanceByAsset(99L);

        assertEquals(2, result.size());
        assertEquals(1L, result.get(0).getId());
    }
}
