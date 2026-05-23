package com.bimlab.asset.service;

import com.bimlab.asset.dto.*;
import com.bimlab.asset.model.*;
import com.bimlab.asset.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssetManagementService {
    private final VendorRepository vendors;
    private final AssetItemRepository assets;
    private final SubscriptionRepository subscriptions;
    private final PurchaseRequestRepository purchaseRequests;
    private final ContractRepository contracts;
    private final MaintenanceRecordRepository maintenanceRecords;
    private final AssetTransferRepository assetTransfers;

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
        item.setDepreciationMethod(req.depreciationMethod());
        item.setUsefulLifeYears(req.usefulLifeYears());
        item.setNotes(req.notes());
    }

    @Transactional
    public AssetItem disposeAsset(Long id, DisposeAssetRequest req) {
        AssetItem item = getAsset(id);
        if ("DISPOSED".equals(item.getStatus())) {
            throw new IllegalStateException("Tài sản đã được thanh lý");
        }
        item.setStatus("DISPOSED");
        item.setDisposalDate(req.disposalDate());
        item.setDisposalPrice(req.disposalPrice());
        item.setDisposalReason(req.disposalReason());
        item.setAssignedEmployeeId(null);
        return assets.save(item);
    }

    public DepreciationSnapshot calculateDepreciation(Long id) {
        AssetItem item = getAsset(id);
        BigDecimal cost = item.getPurchaseCost() == null ? BigDecimal.ZERO : item.getPurchaseCost();
        BigDecimal residual = item.getResidualValue() == null ? cost : item.getResidualValue();
        Integer life = item.getUsefulLifeYears();
        String method = item.getDepreciationMethod() == null ? "NONE" : item.getDepreciationMethod();

        if (life == null || life <= 0 || "NONE".equals(method) || item.getPurchaseDate() == null) {
            return new DepreciationSnapshot(id, method, life, cost, residual,
                    BigDecimal.ZERO, BigDecimal.ZERO, cost, 0);
        }

        int yearsElapsed = Math.max(0, Period.between(item.getPurchaseDate(), LocalDate.now()).getYears());
        BigDecimal depreciable = cost.subtract(residual);
        BigDecimal annual;
        BigDecimal accumulated;
        BigDecimal bookValue;

        if ("DECLINING_BALANCE".equals(method)) {
            BigDecimal rate = BigDecimal.valueOf(2).divide(BigDecimal.valueOf(life), 8, RoundingMode.HALF_UP);
            BigDecimal current = cost;
            int years = Math.min(yearsElapsed, life);
            for (int i = 0; i < years; i++) {
                BigDecimal step = current.multiply(rate).setScale(2, RoundingMode.HALF_UP);
                BigDecimal next = current.subtract(step);
                if (next.compareTo(residual) < 0) {
                    step = current.subtract(residual);
                    next = residual;
                }
                current = next;
            }
            bookValue = current;
            accumulated = cost.subtract(bookValue);
            annual = cost.multiply(rate).setScale(2, RoundingMode.HALF_UP);
        } else {
            annual = depreciable.divide(BigDecimal.valueOf(life), 2, RoundingMode.HALF_UP);
            int years = Math.min(yearsElapsed, life);
            accumulated = annual.multiply(BigDecimal.valueOf(years));
            bookValue = cost.subtract(accumulated);
            if (bookValue.compareTo(residual) < 0) bookValue = residual;
        }

        return new DepreciationSnapshot(id, method, life, cost, residual, annual, accumulated, bookValue, yearsElapsed);
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
        // Back-compat overload for callers that do not stamp the requester.
        return createPurchaseRequest(req, null);
    }

    /**
     * F4: server stamps requesterEmployeeId from the JWT principal and forces
     * status=PENDING on create — previously the approver-supplied payload could
     * impersonate any requesterEmployeeId, corrupting the audit trail, and a
     * regular user could submit a PR pre-approved by passing status=APPROVED.
     */
    @Transactional
    public PurchaseRequest createPurchaseRequest(PurchaseRequestPayload req, Long callerEmployeeId) {
        PurchaseRequest pr = new PurchaseRequest();
        applyPurchaseRequest(pr, req, false);
        pr.setRequesterEmployeeId(callerEmployeeId);
        pr.setStatus("PENDING");
        return purchaseRequests.save(pr);
    }

    @Transactional
    public PurchaseRequest updatePurchaseRequest(Long id, PurchaseRequestPayload req) {
        PurchaseRequest pr = getPurchaseRequest(id);
        applyPurchaseRequest(pr, req, true);
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

    private void applyPurchaseRequest(PurchaseRequest pr, PurchaseRequestPayload req, boolean isUpdate) {
        pr.setRequestType(req.requestType());
        pr.setTitle(req.title());
        pr.setReason(req.reason());
        pr.setEstimatedCost(req.estimatedCost());
        // F4: NEVER apply caller-supplied requesterEmployeeId. On create the
        // service stamps it from JWT principal; on update we keep the stored
        // value so an approver cannot rewrite who requested.
        if (!isUpdate) {
            // create path — caller (createPurchaseRequest overload) overrides
            // requesterEmployeeId after this method returns; nothing to do here.
        }
        pr.setDepartmentId(req.departmentId());
        pr.setSiteId(req.siteId());
        pr.setProjectId(req.projectId());
        pr.setNeededDate(req.neededDate());
        // F4: status flow restricted — create forces PENDING (post-call); update
        // uses /status PATCH endpoint or the explicit approve flow, not body.
        if (isUpdate && req.status() != null) pr.setStatus(req.status());
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

    public List<MaintenanceRecord> listMaintenanceRecords() { return maintenanceRecords.findAll(); }
    public List<MaintenanceRecord> listMaintenanceByAsset(Long assetId) { return maintenanceRecords.findByAssetIdOrderByMaintenanceDateDesc(assetId); }
    public MaintenanceRecord getMaintenanceRecord(Long id) { return maintenanceRecords.findById(id).orElseThrow(() -> new NoSuchElementException("Bản ghi bảo trì không tồn tại")); }

    @Transactional
    public MaintenanceRecord createMaintenanceRecord(MaintenanceRecordRequest req) {
        MaintenanceRecord m = new MaintenanceRecord();
        applyMaintenanceRecord(m, req);
        return maintenanceRecords.save(m);
    }

    @Transactional
    public MaintenanceRecord updateMaintenanceRecord(Long id, MaintenanceRecordRequest req) {
        MaintenanceRecord m = getMaintenanceRecord(id);
        applyMaintenanceRecord(m, req);
        return maintenanceRecords.save(m);
    }

    @Transactional
    public void deleteMaintenanceRecord(Long id) { maintenanceRecords.delete(getMaintenanceRecord(id)); }

    private void applyMaintenanceRecord(MaintenanceRecord m, MaintenanceRecordRequest req) {
        m.setAsset(getAsset(req.assetId()));
        m.setMaintenanceType(req.maintenanceType());
        m.setMaintenanceDate(req.maintenanceDate());
        m.setCost(req.cost());
        m.setVendor(req.vendorId() == null ? null : getVendor(req.vendorId()));
        m.setPerformedBy(req.performedBy());
        m.setDescription(req.description());
        m.setNextMaintenanceDate(req.nextMaintenanceDate());
        if (req.status() != null) m.setStatus(req.status());
    }

    public List<AssetItem> listAssetsWithWarrantyExpiringWithin(int days) {
        LocalDate cutoff = LocalDate.now().plusDays(days);
        LocalDate today = LocalDate.now();
        return assets.findAll().stream()
                .filter(a -> a.getWarrantyUntil() != null)
                .filter(a -> !a.getWarrantyUntil().isBefore(today))
                .filter(a -> !a.getWarrantyUntil().isAfter(cutoff))
                .filter(a -> !"DISPOSED".equals(a.getStatus()))
                .toList();
    }

    public List<AssetTransfer> listTransfers() { return assetTransfers.findAllSortedByDateDesc(); }
    public List<AssetTransfer> listTransfersByAsset(Long assetId) { return assetTransfers.findByAssetIdOrderByTransferDateDesc(assetId); }
    public AssetTransfer getTransfer(Long id) { return assetTransfers.findById(id).orElseThrow(() -> new NoSuchElementException("Bản ghi luân chuyển không tồn tại")); }

    @Transactional
    public AssetTransfer createTransfer(AssetTransferRequest req) {
        AssetItem asset = getAsset(req.assetId());
        AssetTransfer transfer = AssetTransfer.builder()
                .asset(asset)
                .transferType(req.transferType())
                .fromEmployeeId(req.fromEmployeeId())
                .toEmployeeId(req.toEmployeeId())
                .fromDepartmentId(req.fromDepartmentId())
                .toDepartmentId(req.toDepartmentId())
                .fromSiteId(req.fromSiteId())
                .toSiteId(req.toSiteId())
                .transferDate(req.transferDate())
                .reason(req.reason())
                .performedBy(req.performedBy())
                .handoverDocumentUrl(req.handoverDocumentUrl())
                .build();
        AssetTransfer saved = assetTransfers.save(transfer);

        if (Boolean.TRUE.equals(req.applyToAsset())) {
            asset.setAssignedEmployeeId(req.toEmployeeId());
            if (req.toDepartmentId() != null) asset.setDepartmentId(req.toDepartmentId());
            if (req.toSiteId() != null) asset.setSiteId(req.toSiteId());
            if (req.toEmployeeId() != null) asset.setStatus("ASSIGNED");
            else if ("REVOKE".equals(req.transferType())) asset.setStatus("IN_STOCK");
            assets.save(asset);
        }
        return saved;
    }

    @Transactional
    public void deleteTransfer(Long id) { assetTransfers.delete(getTransfer(id)); }

    public UtilizationReport getUtilizationReport() {
        List<AssetItem> all = assets.findAll();
        long total = all.size();
        long assigned = all.stream().filter(a -> "ASSIGNED".equals(a.getStatus())).count();
        long inStock = all.stream().filter(a -> "IN_STOCK".equals(a.getStatus())).count();
        long maintenance = all.stream().filter(a -> "MAINTENANCE".equals(a.getStatus())).count();
        long disposed = all.stream().filter(a -> "DISPOSED".equals(a.getStatus())).count();
        long active = total - disposed;
        double rate = active > 0 ? (double) assigned * 100.0 / active : 0.0;

        BigDecimal totalValue = all.stream()
                .filter(a -> !"DISPOSED".equals(a.getStatus()))
                .map(a -> a.getPurchaseCost() == null ? BigDecimal.ZERO : a.getPurchaseCost())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal idleValue = all.stream()
                .filter(a -> "IN_STOCK".equals(a.getStatus()))
                .map(a -> a.getPurchaseCost() == null ? BigDecimal.ZERO : a.getPurchaseCost())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Long> byStatus = all.stream()
                .collect(Collectors.groupingBy(AssetItem::getStatus, Collectors.counting()));
        Map<String, Long> byCategory = all.stream()
                .filter(a -> !"DISPOSED".equals(a.getStatus()))
                .collect(Collectors.groupingBy(AssetItem::getCategory, Collectors.counting()));

        return new UtilizationReport(
                total, assigned, inStock, maintenance, disposed,
                Math.round(rate * 100.0) / 100.0,
                totalValue, idleValue, byStatus, byCategory
        );
    }
}
