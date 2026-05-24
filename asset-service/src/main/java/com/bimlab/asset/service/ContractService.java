package com.bimlab.asset.service;

import com.bimlab.asset.dto.ContractRequest;
import com.bimlab.asset.model.Contract;
import com.bimlab.asset.model.status.ContractStatus;
import com.bimlab.asset.model.status.StatusParser;
import com.bimlab.asset.repository.ContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

/**
 * Q2: Contract domain split from the original {@code AssetManagementService}.
 * Owns Contract CRUD + status transitions. Depends on:
 * <ul>
 *   <li>{@link VendorService} for vendor resolution in {@link #applyContract}</li>
 *   <li>{@link PurchaseRequestService} for PR resolution when a contract links
 *       to its source PR</li>
 * </ul>
 * Both dependencies are constructor-injected; the existing
 * {@code @Transactional} boundary on the calling method joins any propagated
 * transaction.
 */
@Service
@RequiredArgsConstructor
public class ContractService {
    private final ContractRepository contracts;
    private final VendorService vendorService;
    private final PurchaseRequestService purchaseRequestService;

    @Transactional(readOnly = true)
    public List<Contract> listContracts() {
        return contracts.findAll();
    }

    @Transactional(readOnly = true)
    public Contract getContract(Long id) {
        return contracts.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Hợp đồng không tồn tại"));
    }

    @Transactional
    public Contract createContract(ContractRequest req) {
        if (contracts.existsByContractNumber(req.contractNumber())) {
            throw new IllegalArgumentException("Số hợp đồng đã tồn tại: " + req.contractNumber());
        }
        Contract c = new Contract();
        applyContract(c, req);
        return contracts.save(c);
    }

    @Transactional
    public Contract updateContract(Long id, ContractRequest req) {
        Contract c = getContract(id);
        if (!c.getContractNumber().equals(req.contractNumber())
                && contracts.existsByContractNumber(req.contractNumber())) {
            throw new IllegalArgumentException("Số hợp đồng đã tồn tại: " + req.contractNumber());
        }
        applyContract(c, req);
        return contracts.save(c);
    }

    @Transactional
    public Contract updateContractStatus(Long id, String status) {
        Contract c = getContract(id);
        c.setStatus(StatusParser.parse(ContractStatus.class, status));
        return contracts.save(c);
    }

    @Transactional
    public void deleteContract(Long id) {
        contracts.delete(getContract(id));
    }

    private void applyContract(Contract c, ContractRequest req) {
        c.setContractNumber(req.contractNumber());
        c.setTitle(req.title());
        c.setVendor(req.vendorId() == null ? null : vendorService.getVendor(req.vendorId()));
        c.setPurchaseRequest(req.purchaseRequestId() == null
                ? null
                : purchaseRequestService.getPurchaseRequest(req.purchaseRequestId()));
        c.setSignDate(req.signDate());
        c.setEffectiveFrom(req.effectiveFrom());
        c.setEffectiveTo(req.effectiveTo());
        c.setContractValue(req.contractValue());
        if (req.currency() != null) c.setCurrency(req.currency());
        c.setPaymentTerms(req.paymentTerms());
        ContractStatus parsed = StatusParser.parseOrNull(ContractStatus.class, req.status());
        if (parsed != null) c.setStatus(parsed);
        c.setAttachmentUrl(req.attachmentUrl());
        c.setNotes(req.notes());
    }
}
