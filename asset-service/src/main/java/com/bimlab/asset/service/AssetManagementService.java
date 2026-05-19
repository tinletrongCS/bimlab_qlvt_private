package com.bimlab.asset.service;

import com.bimlab.asset.dto.*;
import com.bimlab.asset.model.*;
import com.bimlab.asset.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class AssetManagementService {
    private final VendorRepository vendors;
    private final AssetItemRepository assets;
    private final SubscriptionRepository subscriptions;
    private final PurchaseRequestRepository purchaseRequests;
    private final ContractRepository contracts;

    public List<Vendor> listVendors() { return vendors.findAll(); }
    public Vendor getVendor(Long id) { return vendors.findById(id).orElseThrow(() -> new NoSuchElementException("Nhà cung cấp không tồn tại")); }

    @Transactional
    public Vendor createVendor(VendorRequest req) {
        return vendors.save(Vendor.builder()
                .name(req.name()).taxCode(req.taxCode()).contactName(req.contactName())
                .email(req.email()).phone(req.phone()).address(req.address()).status(req.status())
                .build());
    }

    @Transactional
    public Vendor updateVendor(Long id, VendorRequest req) {
        Vendor v = getVendor(id);
        v.setName(req.name());
        v.setTaxCode(req.taxCode());
        v.setContactName(req.contactName());
        v.setEmail(req.email());
        v.setPhone(req.phone());
        v.setAddress(req.address());
        if (req.status() != null) v.setStatus(req.status());
        return vendors.save(v);
    }

    @Transactional
    public void deleteVendor(Long id) { vendors.delete(getVendor(id)); }

    public List<AssetItem> listAssets() { return assets.findAll(); }
    public AssetItem getAsset(Long id) { return assets.findById(id).orElseThrow(() -> new NoSuchElementException("Tài sản không tồn tại")); }

    @Transactional
    public AssetItem createAsset(AssetRequest req) {
        AssetItem item = new AssetItem();
        applyAsset(item, req);
        return assets.save(item);
    }

    @Transactional
    public AssetItem updateAsset(Long id, AssetRequest req) {
        AssetItem item = getAsset(id);
        applyAsset(item, req);
        return assets.save(item);
    }

    @Transactional
    public void deleteAsset(Long id) { assets.delete(getAsset(id)); }

    private void applyAsset(AssetItem item, AssetRequest req) {
        item.setAssetCode(req.assetCode());
        item.setName(req.name());
        item.setCategory(req.category());
        item.setSerialNumber(req.serialNumber());
        item.setSource(req.source());
        item.setVendor(req.vendorId() == null ? null : getVendor(req.vendorId()));
        item.setAssignedEmployeeId(req.assignedEmployeeId());
        item.setDepartmentId(req.departmentId());
        item.setSiteId(req.siteId());
        item.setProjectId(req.projectId());
        item.setPurchaseCost(req.purchaseCost());
        item.setResidualValue(req.residualValue());
        item.setPurchaseDate(req.purchaseDate());
        item.setWarrantyUntil(req.warrantyUntil());
        if (req.status() != null) item.setStatus(req.status());
        item.setNotes(req.notes());
    }

    public List<Subscription> listSubscriptions() { return subscriptions.findAll(); }
    public Subscription getSubscription(Long id) { return subscriptions.findById(id).orElseThrow(() -> new NoSuchElementException("Subscription không tồn tại")); }

    @Transactional
    public Subscription createSubscription(SubscriptionRequest req) {
        Subscription s = new Subscription();
        applySubscription(s, req);
        return subscriptions.save(s);
    }

    @Transactional
    public Subscription updateSubscription(Long id, SubscriptionRequest req) {
        Subscription s = getSubscription(id);
        applySubscription(s, req);
        return subscriptions.save(s);
    }

    @Transactional
    public void deleteSubscription(Long id) { subscriptions.delete(getSubscription(id)); }

    private void applySubscription(Subscription s, SubscriptionRequest req) {
        s.setSoftwareName(req.softwareName());
        s.setPlanName(req.planName());
        s.setVendor(req.vendorId() == null ? null : getVendor(req.vendorId()));
        s.setTotalSeats(req.totalSeats());
        s.setUsedSeats(req.usedSeats());
        s.setCost(req.cost());
        s.setBillingCycle(req.billingCycle());
        s.setStartDate(req.startDate());
        s.setRenewalDate(req.renewalDate());
        if (req.status() != null) s.setStatus(req.status());
        s.setNotes(req.notes());
    }

    public List<PurchaseRequest> listPurchaseRequests() { return purchaseRequests.findAll(); }
    public PurchaseRequest getPurchaseRequest(Long id) { return purchaseRequests.findById(id).orElseThrow(() -> new NoSuchElementException("Đề nghị mua sắm không tồn tại")); }

    @Transactional
    public PurchaseRequest createPurchaseRequest(PurchaseRequestPayload req) {
        PurchaseRequest pr = new PurchaseRequest();
        applyPurchaseRequest(pr, req);
        return purchaseRequests.save(pr);
    }

    @Transactional
    public PurchaseRequest updatePurchaseRequest(Long id, PurchaseRequestPayload req) {
        PurchaseRequest pr = getPurchaseRequest(id);
        applyPurchaseRequest(pr, req);
        return purchaseRequests.save(pr);
    }

    @Transactional
    public PurchaseRequest updatePurchaseStatus(Long id, String status) {
        PurchaseRequest pr = getPurchaseRequest(id);
        pr.setStatus(status);
        return purchaseRequests.save(pr);
    }

    @Transactional
    public void deletePurchaseRequest(Long id) { purchaseRequests.delete(getPurchaseRequest(id)); }

    private void applyPurchaseRequest(PurchaseRequest pr, PurchaseRequestPayload req) {
        pr.setRequestType(req.requestType());
        pr.setTitle(req.title());
        pr.setReason(req.reason());
        pr.setEstimatedCost(req.estimatedCost());
        pr.setRequesterEmployeeId(req.requesterEmployeeId());
        pr.setDepartmentId(req.departmentId());
        pr.setSiteId(req.siteId());
        pr.setProjectId(req.projectId());
        pr.setNeededDate(req.neededDate());
        if (req.status() != null) pr.setStatus(req.status());
        pr.setNotes(req.notes());
    }

    public List<Contract> listContracts() { return contracts.findAll(); }
    public Contract getContract(Long id) { return contracts.findById(id).orElseThrow(() -> new NoSuchElementException("Hợp đồng không tồn tại")); }

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
        if (!c.getContractNumber().equals(req.contractNumber()) && contracts.existsByContractNumber(req.contractNumber())) {
            throw new IllegalArgumentException("Số hợp đồng đã tồn tại: " + req.contractNumber());
        }
        applyContract(c, req);
        return contracts.save(c);
    }

    @Transactional
    public Contract updateContractStatus(Long id, String status) {
        Contract c = getContract(id);
        c.setStatus(status);
        return contracts.save(c);
    }

    @Transactional
    public void deleteContract(Long id) { contracts.delete(getContract(id)); }

    private void applyContract(Contract c, ContractRequest req) {
        c.setContractNumber(req.contractNumber());
        c.setTitle(req.title());
        c.setVendor(req.vendorId() == null ? null : getVendor(req.vendorId()));
        c.setPurchaseRequest(req.purchaseRequestId() == null ? null : getPurchaseRequest(req.purchaseRequestId()));
        c.setSignDate(req.signDate());
        c.setEffectiveFrom(req.effectiveFrom());
        c.setEffectiveTo(req.effectiveTo());
        c.setContractValue(req.contractValue());
        if (req.currency() != null) c.setCurrency(req.currency());
        c.setPaymentTerms(req.paymentTerms());
        if (req.status() != null) c.setStatus(req.status());
        c.setAttachmentUrl(req.attachmentUrl());
        c.setNotes(req.notes());
    }
}
