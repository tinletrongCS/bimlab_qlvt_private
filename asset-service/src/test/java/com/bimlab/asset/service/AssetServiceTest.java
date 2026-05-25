package com.bimlab.asset.service;


import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.model.status.VendorStatus;
import com.bimlab.asset.dto.AssetRequest;
import com.bimlab.asset.dto.DepreciationSnapshot;
import com.bimlab.asset.dto.DisposeAssetRequest;
import com.bimlab.asset.dto.UtilizationReport;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.Vendor;
import com.bimlab.asset.repository.AssetItemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Q2: covers all behaviour previously split across DepreciationServiceTest
 * + UtilizationReportTest + the warranty-window portion of
 * MaintenanceServiceTest. Also adds previously-missing smoke coverage for
 * the basic Asset CRUD path (createAsset / updateAsset / getAsset missing
 * case) per Q2 R5 (zero vendor/subscription/asset-CRUD coverage was a
 * regression risk during the split).
 */
@ExtendWith(MockitoExtension.class)
class AssetServiceTest {

    @Mock AssetItemRepository assets;
    @Mock VendorService vendorService;

    @InjectMocks AssetService service;

    // ── Asset CRUD smoke (Q2 R5: previously untested) ────────────────────

    @Test
    void getAsset_throwsWhenMissing() {
        when(assets.findById(99L)).thenReturn(Optional.empty());
        assertThrows(NoSuchElementException.class, () -> service.getAsset(99L));
    }

    @Test
    void createAsset_resolvesVendorWhenIdProvided() {
        Vendor vendor = Vendor.builder().id(7L).name("V").status(VendorStatus.ACTIVE).build();
        when(vendorService.getVendor(7L)).thenReturn(vendor);
        when(assets.save(any(AssetItem.class))).thenAnswer(inv -> inv.getArgument(0));

        AssetRequest req = new AssetRequest(
                "A-1", "Laptop X", "IT", "SN-1", "PURCHASE",
                7L, null, null, null, null,
                new BigDecimal("30000000"), null,
                LocalDate.of(2026, 1, 1), null, "IN_STOCK",
                "STRAIGHT_LINE", 5, null
        );
        AssetItem saved = service.createAsset(req);

        assertEquals(vendor, saved.getVendor());
        assertEquals("A-1", saved.getAssetCode());
        assertEquals(AssetStatus.IN_STOCK, saved.getStatus());
    }

    @Test
    void createAsset_acceptsNullVendor() {
        when(assets.save(any(AssetItem.class))).thenAnswer(inv -> inv.getArgument(0));

        AssetRequest req = new AssetRequest(
                "A-2", "X", "IT", null, null,
                null, null, null, null, null,
                null, null, null, null, null,
                null, null, null
        );
        AssetItem saved = service.createAsset(req);

        assertNull(saved.getVendor());
    }

    // ── Depreciation ─────────────────────────────────────────────────────

    @Test
    void straightLine_calculatesBookValueAfterYears() {
        AssetItem item = AssetItem.builder()
                .id(1L)
                .purchaseCost(new BigDecimal("100000000"))
                .residualValue(new BigDecimal("10000000"))
                .purchaseDate(LocalDate.now().minusYears(3))
                .depreciationMethod("STRAIGHT_LINE")
                .usefulLifeYears(10)
                .build();
        when(assets.findById(1L)).thenReturn(Optional.of(item));

        DepreciationSnapshot snap = service.calculateDepreciation(1L);

        assertEquals(new BigDecimal("9000000.00"), snap.annualDepreciation());
        assertEquals(3, snap.yearsElapsed());
        assertEquals(new BigDecimal("27000000.00"), snap.accumulatedDepreciation());
        assertEquals(new BigDecimal("73000000.00"), snap.bookValue());
    }

    @Test
    void straightLine_caps_bookValue_at_residual_after_useful_life() {
        AssetItem item = AssetItem.builder()
                .id(1L)
                .purchaseCost(new BigDecimal("100000000"))
                .residualValue(new BigDecimal("10000000"))
                .purchaseDate(LocalDate.now().minusYears(15))
                .depreciationMethod("STRAIGHT_LINE")
                .usefulLifeYears(10)
                .build();
        when(assets.findById(1L)).thenReturn(Optional.of(item));

        DepreciationSnapshot snap = service.calculateDepreciation(1L);

        assertEquals(0, snap.bookValue().compareTo(new BigDecimal("10000000")));
    }

    @Test
    void none_method_returns_full_cost_as_book_value() {
        AssetItem item = AssetItem.builder()
                .id(1L)
                .purchaseCost(new BigDecimal("50000000"))
                .residualValue(new BigDecimal("0"))
                .purchaseDate(LocalDate.now().minusYears(2))
                .depreciationMethod("NONE")
                .build();
        when(assets.findById(1L)).thenReturn(Optional.of(item));

        DepreciationSnapshot snap = service.calculateDepreciation(1L);

        assertEquals(BigDecimal.ZERO, snap.annualDepreciation());
        assertEquals(new BigDecimal("50000000"), snap.bookValue());
    }

    // ── Dispose ──────────────────────────────────────────────────────────

    @Test
    void disposeAsset_setsStatusAndUnassigns() {
        AssetItem item = AssetItem.builder()
                .id(1L).assetCode("A1").name("Laptop").category("IT")
                .status(AssetStatus.ASSIGNED).assignedEmployeeId(42L)
                .build();
        when(assets.findById(1L)).thenReturn(Optional.of(item));
        when(assets.save(any(AssetItem.class))).thenAnswer(inv -> inv.getArgument(0));

        DisposeAssetRequest req = new DisposeAssetRequest(
                LocalDate.of(2026, 5, 19),
                new BigDecimal("2000000"),
                "Hỏng hóc không sửa được"
        );

        AssetItem disposed = service.disposeAsset(1L, req);

        assertEquals(AssetStatus.DISPOSED, disposed.getStatus());
        assertEquals(LocalDate.of(2026, 5, 19), disposed.getDisposalDate());
        assertEquals(new BigDecimal("2000000"), disposed.getDisposalPrice());
        assertEquals("Hỏng hóc không sửa được", disposed.getDisposalReason());
        assertNull(disposed.getAssignedEmployeeId());
    }

    @Test
    void disposeAsset_rejects_already_disposed() {
        AssetItem item = AssetItem.builder().id(1L).status(AssetStatus.DISPOSED).build();
        when(assets.findById(1L)).thenReturn(Optional.of(item));

        DisposeAssetRequest req = new DisposeAssetRequest(LocalDate.now(), null, null);

        assertThrows(IllegalStateException.class, () -> service.disposeAsset(1L, req));
        verify(assets, never()).save(any());
    }

    // ── Warranty filter (was in MaintenanceServiceTest) ──────────────────

    @Test
    void warrantyExpiring_filtersAssetsInWindow() {
        AssetItem inWindow = AssetItem.builder().id(1L).warrantyUntil(LocalDate.now().plusDays(10)).status(AssetStatus.ASSIGNED).build();
        AssetItem expired = AssetItem.builder().id(2L).warrantyUntil(LocalDate.now().minusDays(5)).status(AssetStatus.ASSIGNED).build();
        AssetItem far = AssetItem.builder().id(3L).warrantyUntil(LocalDate.now().plusDays(60)).status(AssetStatus.ASSIGNED).build();
        AssetItem disposed = AssetItem.builder().id(4L).warrantyUntil(LocalDate.now().plusDays(10)).status(AssetStatus.DISPOSED).build();
        AssetItem noWarranty = AssetItem.builder().id(5L).status(AssetStatus.ASSIGNED).build();
        when(assets.findAll()).thenReturn(List.of(inWindow, expired, far, disposed, noWarranty));

        List<AssetItem> expiring = service.listAssetsWithWarrantyExpiringWithin(30);

        assertEquals(1, expiring.size());
        assertEquals(1L, expiring.get(0).getId());
    }

    // ── Utilization report (was in UtilizationReportTest) ────────────────

    @Test
    void utilizationReport_aggregatesByStatusAndCategory() {
        when(assets.findAll()).thenReturn(List.of(
                AssetItem.builder().status(AssetStatus.ASSIGNED).category("Laptop").purchaseCost(new BigDecimal("30000000")).build(),
                AssetItem.builder().status(AssetStatus.ASSIGNED).category("Laptop").purchaseCost(new BigDecimal("25000000")).build(),
                AssetItem.builder().status(AssetStatus.IN_STOCK).category("Monitor").purchaseCost(new BigDecimal("5000000")).build(),
                AssetItem.builder().status(AssetStatus.MAINTENANCE).category("Laptop").purchaseCost(new BigDecimal("20000000")).build(),
                AssetItem.builder().status(AssetStatus.DISPOSED).category("Phone").purchaseCost(new BigDecimal("10000000")).build()
        ));

        UtilizationReport report = service.getUtilizationReport();

        assertEquals(5, report.totalAssets());
        assertEquals(2, report.assignedAssets());
        assertEquals(1, report.idleAssets());
        assertEquals(1, report.maintenanceAssets());
        assertEquals(1, report.disposedAssets());
        assertEquals(50.0, report.utilizationRate());
        assertEquals(0, new BigDecimal("80000000").compareTo(report.totalPurchaseValue()));
        assertEquals(0, new BigDecimal("5000000").compareTo(report.totalIdleValue()));
        assertEquals(2L, report.byStatus().get("ASSIGNED"));
        assertEquals(3L, report.byCategory().get("Laptop"));
        assertNull(report.byCategory().get("Phone"));
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
