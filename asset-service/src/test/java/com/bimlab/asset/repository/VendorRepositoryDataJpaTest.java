package com.bimlab.asset.repository;

import com.bimlab.asset.model.Vendor;
import com.bimlab.asset.model.status.VendorStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Q8: persistence-layer test using H2 in-memory. Confirms VendorRepository +
 * Vendor entity mapping round-trip cleanly (incl. Q5 enum mapping).
 */
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class VendorRepositoryDataJpaTest {

    @Autowired VendorRepository vendors;

    @Test
    void save_and_findById() {
        Vendor saved = vendors.save(Vendor.builder()
                .name("Acme")
                .taxCode("0123456789")
                .contactName("Alice")
                .status(VendorStatus.ACTIVE)
                .build());

        assertNotNull(saved.getId());
        assertNotNull(saved.getCreatedAt(), "prePersist should stamp createdAt");

        Optional<Vendor> loaded = vendors.findById(saved.getId());
        assertEquals("Acme", loaded.orElseThrow().getName());
        assertEquals(VendorStatus.ACTIVE, loaded.get().getStatus());
    }

    @Test
    void prePersist_defaultsStatusToActive() {
        Vendor saved = vendors.save(Vendor.builder().name("NoStatusVendor").build());
        assertEquals(VendorStatus.ACTIVE, saved.getStatus());
    }
}
