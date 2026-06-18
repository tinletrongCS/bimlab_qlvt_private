package com.bimlab.asset.service;


import com.bimlab.asset.model.status.VendorStatus;
import com.bimlab.asset.model.status.ContractStatus;
import com.bimlab.asset.dto.request.ContractRequest;
import com.bimlab.asset.model.Contract;
import com.bimlab.asset.model.Vendor;
import com.bimlab.asset.repository.ContractRepository;
import com.bimlab.asset.storage.MinioService;
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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Q2: targets {@link ContractService}. Cross-domain Vendor and
 * PurchaseRequest lookups route through their respective service mocks.
 * Q7: adds MinioService mock for attachment lifecycle.
 */
@ExtendWith(MockitoExtension.class)
class ContractServiceTest {

    @Mock ContractRepository contracts;
    @Mock VendorService vendorService;
    @Mock PurchaseRequestService purchaseRequestService;
    @Mock MinioService minioService;

    @InjectMocks ContractService service;

    @Test
    void createContract_savesWithDefaults() {
        ContractRequest req = new ContractRequest(
                "HD-2026-001", "Hợp đồng mua thiết bị", null, null,
                LocalDate.of(2026, 1, 1), null, null,
                new BigDecimal("100000000"), null, null, null, null, null, null
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
                "HD-DUP", "x", null, null, null, null, null, null, null, null, null, null, null, null
        );
        when(contracts.existsByContractNumber("HD-DUP")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.createContract(req));
        assertTrue(ex.getMessage().contains("HD-DUP"));
        verify(contracts, never()).save(any());
    }

    @Test
    void updateContract_attachesVendor() {
        Contract existing = Contract.builder().id(1L).contractNumber("HD-A").title("x").status(ContractStatus.DRAFT).build();
        Vendor vendor = Vendor.builder().id(7L).name("V").status(VendorStatus.ACTIVE).build();
        when(contracts.findById(1L)).thenReturn(Optional.of(existing));
        when(vendorService.getVendor(7L)).thenReturn(vendor);
        when(contracts.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        ContractRequest req = new ContractRequest(
                "HD-A", "x updated", 7L, null, null, null, null, null, null, null, "ACTIVE", null, null, null
        );
        Contract updated = service.updateContract(1L, req);

        assertEquals(vendor, updated.getVendor());
        assertEquals("x updated", updated.getTitle());
        assertEquals(ContractStatus.ACTIVE, updated.getStatus());
    }

    @Test
    void getContract_throwsWhenMissing() {
        when(contracts.findById(99L)).thenReturn(Optional.empty());
        assertThrows(NoSuchElementException.class, () -> service.getContract(99L));
    }

    @Test
    void updateContractStatus_persists() {
        Contract existing = Contract.builder().id(1L).status(ContractStatus.DRAFT).build();
        when(contracts.findById(1L)).thenReturn(Optional.of(existing));
        when(contracts.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        Contract updated = service.updateContractStatus(1L, "ACTIVE");

        assertEquals(ContractStatus.ACTIVE, updated.getStatus());
    }

    // Q7: MinIO lifecycle tests

    @Test
    void updateContract_deletesOldObjectKey_whenChanged() {
        Contract existing = Contract.builder()
                .id(1L).contractNumber("HD-A").title("x").status(ContractStatus.DRAFT)
                .attachmentObjectKey("contracts/old-key.pdf").build();
        when(contracts.findById(1L)).thenReturn(Optional.of(existing));
        when(contracts.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        ContractRequest req = new ContractRequest(
                "HD-A", "x", null, null, null, null, null, null, null, null, null,
                null, "contracts/new-key.pdf", null
        );
        service.updateContract(1L, req);

        verify(minioService).delete(eq("contracts/old-key.pdf"));
    }

    @Test
    void updateContract_doesNotDeleteWhenKeyUnchanged() {
        Contract existing = Contract.builder()
                .id(1L).contractNumber("HD-A").title("x").status(ContractStatus.DRAFT)
                .attachmentObjectKey("contracts/same.pdf").build();
        when(contracts.findById(1L)).thenReturn(Optional.of(existing));
        when(contracts.save(any(Contract.class))).thenAnswer(inv -> inv.getArgument(0));

        ContractRequest req = new ContractRequest(
                "HD-A", "x", null, null, null, null, null, null, null, null, null,
                null, "contracts/same.pdf", null
        );
        service.updateContract(1L, req);

        verify(minioService, never()).delete(any());
    }

    @Test
    void deleteContract_callsMinioDelete() {
        Contract existing = Contract.builder()
                .id(1L).contractNumber("HD-A").title("x").status(ContractStatus.DRAFT)
                .attachmentObjectKey("contracts/key.pdf").build();
        when(contracts.findById(1L)).thenReturn(Optional.of(existing));

        service.deleteContract(1L);

        verify(contracts).delete(existing);
        verify(minioService).delete(eq("contracts/key.pdf"));
    }

    @Test
    void deleteContract_nullKey_doesNotCallMinio() {
        Contract existing = Contract.builder()
                .id(1L).contractNumber("HD-A").title("x").status(ContractStatus.DRAFT).build();
        when(contracts.findById(1L)).thenReturn(Optional.of(existing));

        service.deleteContract(1L);

        verify(contracts).delete(existing);
        verify(minioService, never()).delete(any());
    }
}
