package com.bimlab.asset.service;

import com.bimlab.asset.dto.VendorRequest;
import com.bimlab.asset.model.Vendor;
import com.bimlab.asset.repository.VendorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Q2 R5: Vendor CRUD was zero-coverage before the split. These smoke tests
 * lock the public surface so the resolver consumed by Subscription /
 * Contract / Maintenance / Asset cannot silently regress.
 */
@ExtendWith(MockitoExtension.class)
class VendorServiceTest {

    @Mock VendorRepository vendors;

    @InjectMocks VendorService service;

    @Test
    void getVendor_throwsWhenMissing() {
        when(vendors.findById(99L)).thenReturn(Optional.empty());
        assertThrows(NoSuchElementException.class, () -> service.getVendor(99L));
    }

    @Test
    void createVendor_persistsAllFields() {
        when(vendors.save(any(Vendor.class))).thenAnswer(inv -> inv.getArgument(0));

        VendorRequest req = new VendorRequest(
                "FPT", "0100109106", "Anh Hùng",
                "sales@fpt.vn", "0901234567", "Cầu Giấy", "ACTIVE"
        );
        Vendor saved = service.createVendor(req);

        assertEquals("FPT", saved.getName());
        assertEquals("0100109106", saved.getTaxCode());
        assertEquals("ACTIVE", saved.getStatus());
        verify(vendors).save(any(Vendor.class));
    }

    @Test
    void updateVendor_overwritesMutableFields() {
        Vendor existing = Vendor.builder().id(1L).name("Old").status("ACTIVE").build();
        when(vendors.findById(1L)).thenReturn(Optional.of(existing));
        when(vendors.save(any(Vendor.class))).thenAnswer(inv -> inv.getArgument(0));

        VendorRequest req = new VendorRequest(
                "New", "0123", "x", "x@x.vn", "0900000000", "HN", "INACTIVE"
        );
        Vendor updated = service.updateVendor(1L, req);

        assertEquals("New", updated.getName());
        assertEquals("INACTIVE", updated.getStatus());
    }

    @Test
    void deleteVendor_callsRepoDelete() {
        Vendor existing = Vendor.builder().id(1L).name("X").status("ACTIVE").build();
        when(vendors.findById(1L)).thenReturn(Optional.of(existing));

        service.deleteVendor(1L);

        verify(vendors).delete(existing);
    }
}
