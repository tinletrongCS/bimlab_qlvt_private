package com.bimlab.asset.service;

import com.bimlab.asset.dto.ContractRequest;
import com.bimlab.asset.model.Contract;
import com.bimlab.asset.model.Vendor;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.ContractRepository;
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
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContractServiceTest {

    @Mock VendorRepository vendors;
    @Mock AssetItemRepository assets;
    @Mock SubscriptionRepository subscriptions;
    @Mock PurchaseRequestRepository purchaseRequests;
    @Mock ContractRepository contracts;

    @InjectMocks AssetManagementService service;

    @Test
    void createContract_savesWithDefaults() {
        ContractRequest req = new ContractRequest(
                "HD-2026-001", "Hợp đồng mua thiết bị", null, null,
                LocalDate.of(2026, 1, 1), null, null,
                new BigDecimal("100000000"), null, null, null, null, null
        );
        when(contracts.existsByContractNumber("HD-2026-001")).thenReturn(false);
        when(contracts.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        Contract saved = service.createContract(req);

        assertEquals("HD-2026-001", saved.getContractNumber());
        assertEquals("Hợp đồng mua thiết bị", saved.getTitle());
        assertEquals(new BigDecimal("100000000"), saved.getContractValue());
        verify(contracts).save(any(Contract.class));
    }

    @Test
    void createContract_rejectsDuplicateNumber() {
        ContractRequest req = new ContractRequest(
                "HD-DUP", "x", null, null, null, null, null, null, null, null, null, null, null
        );
        when(contracts.existsByContractNumber("HD-DUP")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.createContract(req));
        assertTrue(ex.getMessage().contains("HD-DUP"));
        verify(contracts, never()).save(any());
    }

    @Test
    void updateContract_attachesVendor() {
        Contract existing = Contract.builder().id(1L).contractNumber("HD-A").title("x").status("DRAFT").build();
        Vendor vendor = Vendor.builder().id(7L).name("V").status("ACTIVE").build();
        when(contracts.findById(1L)).thenReturn(Optional.of(existing));
        when(vendors.findById(7L)).thenReturn(Optional.of(vendor));
        when(contracts.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        ContractRequest req = new ContractRequest(
                "HD-A", "x updated", 7L, null, null, null, null, null, null, null, "ACTIVE", null, null
        );
        Contract updated = service.updateContract(1L, req);

        assertEquals(vendor, updated.getVendor());
        assertEquals("x updated", updated.getTitle());
        assertEquals("ACTIVE", updated.getStatus());
    }

    @Test
    void getContract_throwsWhenMissing() {
        when(contracts.findById(99L)).thenReturn(Optional.empty());
        assertThrows(NoSuchElementException.class, () -> service.getContract(99L));
    }

    @Test
    void updateContractStatus_persists() {
        Contract existing = Contract.builder().id(1L).status("DRAFT").build();
        when(contracts.findById(1L)).thenReturn(Optional.of(existing));
        when(contracts.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        Contract updated = service.updateContractStatus(1L, "ACTIVE");

        assertEquals("ACTIVE", updated.getStatus());
    }
}
