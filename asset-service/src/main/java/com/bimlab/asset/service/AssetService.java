package com.bimlab.asset.service;

import com.bimlab.asset.dto.AssetRequest;
import com.bimlab.asset.dto.DepreciationSnapshot;
import com.bimlab.asset.dto.DisposeAssetRequest;
import com.bimlab.asset.dto.UtilizationReport;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.repository.AssetItemRepository;
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

/**
 * Q2: Asset domain split from the original {@code AssetManagementService}.
 * Owns Asset CRUD, disposal, depreciation math, warranty filtering, and
 * the utilization aggregation report (which only reads
 * {@link AssetItemRepository}, so it stays here rather than getting its own
 * service class).
 *
 * <p>{@link #getAsset(Long)} is intentionally public — consumed as a
 * cross-domain resolver by {@link MaintenanceService} and
 * {@link AssetTransferService}.
 */
@Service
@RequiredArgsConstructor
public class AssetService {
    private final AssetItemRepository assets;
    private final VendorService vendorService;

    @Transactional(readOnly = true)
    public List<AssetItem> listAssets() {
        return assets.findAll();
    }

    @Transactional(readOnly = true)
    public AssetItem getAsset(Long id) {
        return assets.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Tài sản không tồn tại"));
    }

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
    public void deleteAsset(Long id) {
        assets.delete(getAsset(id));
    }

    private void applyAsset(AssetItem item, AssetRequest req) {
        item.setAssetCode(req.assetCode());
        item.setName(req.name());
        item.setCategory(req.category());
        item.setSerialNumber(req.serialNumber());
        item.setSource(req.source());
        item.setVendor(req.vendorId() == null ? null : vendorService.getVendor(req.vendorId()));
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

    /**
     * Q2-followup N3: prefer {@link #calculateDepreciation(AssetItem)} when the
     * caller has already loaded the item (avoids TOCTOU where the access check
     * runs against one snapshot and depreciation against another).
     */
    @Transactional(readOnly = true)
    public DepreciationSnapshot calculateDepreciation(Long id) {
        return calculateDepreciation(getAsset(id));
    }

    public DepreciationSnapshot calculateDepreciation(AssetItem item) {
        Long id = item.getId();
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
