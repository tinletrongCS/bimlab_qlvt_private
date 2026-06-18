package com.bimlab.asset.service;


import com.bimlab.asset.model.status.SubscriptionStatus;
import com.bimlab.asset.model.status.VendorStatus;
import com.bimlab.asset.dto.request.SubscriptionRequest;
import com.bimlab.asset.model.Subscription;
import com.bimlab.asset.model.Vendor;
import com.bimlab.asset.repository.SubscriptionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Q2 R5: Subscription CRUD was zero-coverage before the split. These smoke
 * tests lock the cross-domain vendor lookup contract used in
 * {@code applySubscription}.
 */
@ExtendWith(MockitoExtension.class)
class SubscriptionServiceTest {

    @Mock SubscriptionRepository subscriptions;
    @Mock VendorService vendorService;

    @InjectMocks SubscriptionService service;

    @Test
    void getSubscription_throwsWhenMissing() {
        when(subscriptions.findById(99L)).thenReturn(Optional.empty());
        assertThrows(NoSuchElementException.class, () -> service.getSubscription(99L));
    }

    @Test
    void createSubscription_attachesVendor() {
        Vendor vendor = Vendor.builder().id(7L).name("MSFT").status(VendorStatus.ACTIVE).build();
        when(vendorService.getVendor(7L)).thenReturn(vendor);
        when(subscriptions.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));

        SubscriptionRequest req = new SubscriptionRequest(
                "Office 365", "E3", 7L,
                100, 80, new BigDecimal("12000000"),
                "MONTHLY",
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2027, 1, 1),
                "ACTIVE", null
        );
        Subscription saved = service.createSubscription(req);

        assertEquals(vendor, saved.getVendor());
        assertEquals("Office 365", saved.getSoftwareName());
        assertEquals(100, saved.getTotalSeats());
        assertEquals(SubscriptionStatus.ACTIVE, saved.getStatus());
    }

    @Test
    void createSubscription_acceptsNullVendor() {
        when(subscriptions.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));

        SubscriptionRequest req = new SubscriptionRequest(
                "GitHub Team", "Team", null,
                10, 5, new BigDecimal("5000000"),
                "ANNUAL", LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 1),
                null, null
        );
        Subscription saved = service.createSubscription(req);

        assertNull(saved.getVendor());
    }

    @Test
    void updateSubscription_overwritesFields() {
        Subscription existing = Subscription.builder()
                .id(1L).softwareName("Old").totalSeats(50).status(SubscriptionStatus.ACTIVE).build();
        when(subscriptions.findById(1L)).thenReturn(Optional.of(existing));
        when(subscriptions.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));

        SubscriptionRequest req = new SubscriptionRequest(
                "New", "Pro", null, 200, 150,
                new BigDecimal("24000000"), "MONTHLY",
                LocalDate.now(), LocalDate.now().plusYears(1),
                "EXPIRED", null
        );
        Subscription updated = service.updateSubscription(1L, req);

        assertEquals("New", updated.getSoftwareName());
        assertEquals(200, updated.getTotalSeats());
        assertEquals(SubscriptionStatus.EXPIRED, updated.getStatus());
    }
}
