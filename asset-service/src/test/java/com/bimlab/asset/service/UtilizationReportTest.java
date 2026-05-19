package com.bimlab.asset.service;

import com.bimlab.asset.dto.UtilizationReport;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.PurchaseRequestRepository;
import com.bimlab.asset.repository.SubscriptionRepository;
import com.bimlab.asset.repository.VendorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UtilizationReportTest {

    @Mock VendorRepository vendors;
    @Mock AssetItemRepository assets;
    @Mock SubscriptionRepository subscriptions;
    @Mock PurchaseRequestRepository purchaseRequests;

    @InjectMocks AssetManagementService service;

    @Test
    void utilizationReport_aggregatesByStatusAndCategory() {
        when(assets.findAll()).thenReturn(List.of(
                AssetItem.builder().status("ASSIGNED").category("Laptop").purchaseCost(new BigDecimal("30000000")).build(),
                AssetItem.builder().status("ASSIGNED").category("Laptop").purchaseCost(new BigDecimal("25000000")).build(),
                AssetItem.builder().status("IN_STOCK").category("Monitor").purchaseCost(new BigDecimal("5000000")).build(),
                AssetItem.builder().status("MAINTENANCE").category("Laptop").purchaseCost(new BigDecimal("20000000")).build(),
                AssetItem.builder().status("DISPOSED").category("Phone").purchaseCost(new BigDecimal("10000000")).build()
        ));

        UtilizationReport report = service.getUtilizationReport();

        assertEquals(5, report.totalAssets());
        assertEquals(2, report.assignedAssets());
        assertEquals(1, report.idleAssets());
        assertEquals(1, report.maintenanceAssets());
        assertEquals(1, report.disposedAssets());
        // 2 assigned out of 4 active (5 total - 1 disposed) = 50%
        assertEquals(50.0, report.utilizationRate());
        // Total value excludes DISPOSED
        assertEquals(0, new BigDecimal("80000000").compareTo(report.totalPurchaseValue()));
        assertEquals(0, new BigDecimal("5000000").compareTo(report.totalIdleValue()));
        assertEquals(2L, report.byStatus().get("ASSIGNED"));
        assertEquals(3L, report.byCategory().get("Laptop"));
        assertNull(report.byCategory().get("Phone")); // DISPOSED filtered
    }

    @Test
    void utilizationReport_emptyState() {
        when(assets.findAll()).thenReturn(List.of());

        UtilizationReport report = service.getUtilizationReport();

        assertEquals(0, report.totalAssets());
        assertEquals(0.0, report.utilizationRate());
        assertEquals(0, BigDecimal.ZERO.compareTo(report.totalPurchaseValue()));
    }
}
