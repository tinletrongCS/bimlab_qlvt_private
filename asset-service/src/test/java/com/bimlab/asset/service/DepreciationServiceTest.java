package com.bimlab.asset.service;

import com.bimlab.asset.dto.DepreciationSnapshot;
import com.bimlab.asset.dto.DisposeAssetRequest;
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
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DepreciationServiceTest {

    @Mock VendorRepository vendors;
    @Mock AssetItemRepository assets;
    @Mock SubscriptionRepository subscriptions;
    @Mock PurchaseRequestRepository purchaseRequests;

    @InjectMocks AssetManagementService service;

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

    @Test
    void disposeAsset_setsStatusAndUnassigns() {
        AssetItem item = AssetItem.builder()
                .id(1L).assetCode("A1").name("Laptop").category("IT")
                .status("ASSIGNED").assignedEmployeeId(42L)
                .build();
        when(assets.findById(1L)).thenReturn(Optional.of(item));
        when(assets.save(any(AssetItem.class))).thenAnswer(inv -> inv.getArgument(0));

        DisposeAssetRequest req = new DisposeAssetRequest(LocalDate.of(2026, 5, 19),
                new BigDecimal("2000000"), "Hỏng hóc không sửa được");

        AssetItem disposed = service.disposeAsset(1L, req);

        assertEquals("DISPOSED", disposed.getStatus());
        assertEquals(LocalDate.of(2026, 5, 19), disposed.getDisposalDate());
        assertEquals(new BigDecimal("2000000"), disposed.getDisposalPrice());
        assertEquals("Hỏng hóc không sửa được", disposed.getDisposalReason());
        assertNull(disposed.getAssignedEmployeeId());
    }

    @Test
    void disposeAsset_rejects_already_disposed() {
        AssetItem item = AssetItem.builder().id(1L).status("DISPOSED").build();
        when(assets.findById(1L)).thenReturn(Optional.of(item));

        DisposeAssetRequest req = new DisposeAssetRequest(LocalDate.now(), null, null);

        assertThrows(IllegalStateException.class, () -> service.disposeAsset(1L, req));
        verify(assets, never()).save(any());
    }
}
