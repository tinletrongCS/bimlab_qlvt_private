package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.AssetRequest;
import com.bimlab.asset.dto.request.DisposeAssetRequest;
import com.bimlab.asset.dto.response.DepreciationSnapshot;
import com.bimlab.asset.dto.response.UtilizationReportResponse;
import com.bimlab.asset.model.AssetCatalogItem;
import com.bimlab.asset.model.AssetCategory;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.status.AssetClass;
import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.model.status.FixedAssetType;
import com.bimlab.asset.model.status.StatusParser;
import com.bimlab.asset.model.status.ToolUsageType;
import com.bimlab.asset.repository.AssetCatalogItemRepository;
import com.bimlab.asset.repository.AssetCategoryRepository;
import com.bimlab.asset.repository.AssetItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
 * Q5: status fields are type-safe {@link AssetStatus} enums.
 */
@Service
@RequiredArgsConstructor
public class AssetService {
    private final AssetItemRepository assets;
    private final VendorService vendorService;
    private final AssetCategoryRepository assetCategories;
    private final AssetCatalogItemRepository catalogItems;

    @Transactional(readOnly = true)
    public List<AssetItem> listAssets() {
        return assets.findAll();
    }

    @Transactional(readOnly = true)
    public Page<AssetItem> listAssetsPaged(Pageable pageable) {
        return assets.findAll(pageable);
    }


    @Transactional(readOnly = true)
    public AssetItem getAssetById(Long id) {
        return assets.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy tài sản"));
    }

    @Transactional(readOnly = true)
    public AssetItem getAsset(Long id) {
        return getAssetById(id);
    }

    @Transactional
    public AssetItem createAsset(AssetRequest req) {
        AssetItem item = new AssetItem();
        applyAsset(item, req);
        return assets.save(item);
    }

    @Transactional
    public AssetItem updateAsset(Long id, AssetRequest req) {
        AssetItem item = getAssetById(id);
        applyAsset(item, req);
        return assets.save(item);
    }

    @Transactional
    public void deleteAsset(Long id) {
        assets.delete(getAssetById(id));
    }

    private void applyAsset(AssetItem item, AssetRequest req) {
        item.setAssetCode(req.assetCode());
        item.setName(req.name());
        AssetCatalogItem catalogItem = req.catalogItemId() == null
                ? null
                : catalogItems.findById(req.catalogItemId())
                        .orElseThrow(() -> new NoSuchElementException("Danh mục vật tư không tồn tại"));
        AssetCategory assetCategory = req.categoryId() == null
                ? null
                : assetCategories.findById(req.categoryId())
                        .orElseThrow(() -> new NoSuchElementException("Nhóm tài sản không tồn tại"));
        item.setCatalogItem(catalogItem);
        item.setAssetCategory(assetCategory);
        item.setParentAsset(req.parentAssetId() == null ? null : getAssetById(req.parentAssetId()));
        item.setCategory(req.category());
        AssetClass assetClass = StatusParser.parseOrNull(AssetClass.class, req.assetClass());
        if (assetClass == null && assetCategory != null) {
            assetClass = assetCategory.getAssetClass();
        }
        if (assetClass != null) item.setAssetClass(assetClass);
        FixedAssetType fixedAssetType = StatusParser.parseOrNull(FixedAssetType.class, req.fixedAssetType());
        if (fixedAssetType != null) item.setFixedAssetType(fixedAssetType);
        ToolUsageType toolUsageType = StatusParser.parseOrNull(ToolUsageType.class, req.toolUsageType());
        if (toolUsageType != null) item.setToolUsageType(toolUsageType);
        item.setSerialNumber(req.serialNumber());
        item.setSource(req.source());
        item.setVendor(req.vendorId() == null ? null : vendorService.getVendor(req.vendorId()));
        item.setAssignedEmployeeId(req.assignedEmployeeId());
        item.setDepartmentId(req.departmentId());
        item.setSiteId(req.siteId());
        item.setProjectId(req.projectId());
        item.setUseDate(req.useDate());
        item.setDepreciationStartDate(req.depreciationStartDate());
        item.setOriginalCost(req.originalCost());
        item.setPurchaseCost(req.purchaseCost());
        item.setAccumulatedDepreciation(req.accumulatedDepreciation());
        item.setBookValue(req.bookValue());
        item.setResidualValue(req.residualValue());
        item.setPurchaseDate(req.purchaseDate());
        item.setWarrantyUntil(req.warrantyUntil());
        AssetStatus parsed = StatusParser.parseOrNull(AssetStatus.class, req.status());
        if (parsed != null) item.setStatus(parsed);
        item.setDepreciationMethod(req.depreciationMethod());
        item.setUsefulLifeMonths(req.usefulLifeMonths());
        item.setUsefulLifeYears(req.usefulLifeYears());
        item.setDepreciationRate(req.depreciationRate());
        item.setManufactureYear(req.manufactureYear());
        item.setInstallationYear(req.installationYear());
        item.setCountryCode(req.countryCode());
        item.setCapacity(req.capacity());
        item.setCapacityUnit(req.capacityUnit());
        item.setRealCapacity(req.realCapacity());
        item.setTechnicalDescription(req.technicalDescription());
        item.setNotes(req.notes());
    }

    @Transactional
    public AssetItem disposeAsset(Long id, DisposeAssetRequest req) {
        AssetItem item = getAssetById(id);
        if (item.getStatus() == AssetStatus.DISPOSED) {
            throw new IllegalStateException("Tài sản đã được thanh lý");
        }
        item.setStatus(AssetStatus.DISPOSED);
        item.setDisposalDate(req.disposalDate());
        item.setDisposalPrice(req.disposalPrice());
        item.setDisposalReason(req.disposalReason());
        item.setAssignedEmployeeId(null);
        return assets.save(item);
    }

    @Transactional(readOnly = true)
    public DepreciationSnapshot calculateDepreciation(Long id) {
        return calculateDepreciation(getAssetById(id));
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

    @Transactional(readOnly = true)
    public List<AssetItem> listAssetsWithWarrantyExpiringWithin(int days) {
        LocalDate cutoff = LocalDate.now().plusDays(days);
        LocalDate today = LocalDate.now();
        return assets.findAll().stream()
                .filter(a -> a.getWarrantyUntil() != null)
                .filter(a -> !a.getWarrantyUntil().isBefore(today))
                .filter(a -> !a.getWarrantyUntil().isAfter(cutoff))
                .filter(a -> a.getStatus() != AssetStatus.DISPOSED)
                .toList();
    }

    @Transactional(readOnly = true)
    public UtilizationReportResponse getUtilizationReport() {
        List<AssetItem> all = assets.findAll();
        long total = all.size();
        long assigned = all.stream().filter(a -> a.getStatus() == AssetStatus.ASSIGNED).count();
        long inStock = all.stream().filter(a -> a.getStatus() == AssetStatus.IN_STOCK).count();
        long maintenance = all.stream().filter(a -> a.getStatus() == AssetStatus.MAINTENANCE).count();
        long disposed = all.stream().filter(a -> a.getStatus() == AssetStatus.DISPOSED).count();
        long active = total - disposed;
        double rate = active > 0 ? (double) assigned * 100.0 / active : 0.0;

        BigDecimal totalValue = all.stream()
                .filter(a -> a.getStatus() != AssetStatus.DISPOSED)
                .map(a -> a.getPurchaseCost() == null ? BigDecimal.ZERO : a.getPurchaseCost())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal idleValue = all.stream()
                .filter(a -> a.getStatus() == AssetStatus.IN_STOCK)
                .map(a -> a.getPurchaseCost() == null ? BigDecimal.ZERO : a.getPurchaseCost())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Q5: enum.name() keeps the JSON shape stable for FE (Map<String,Long>).
        Map<String, Long> byStatus = all.stream()
                .collect(Collectors.groupingBy(a -> a.getStatus().name(), Collectors.counting()));
        Map<String, Long> byCategory = all.stream()
                .filter(a -> a.getStatus() != AssetStatus.DISPOSED)
                .collect(Collectors.groupingBy(
                        a -> a.getCategory() != null
                                ? a.getCategory()
                                : a.getAssetCategory() != null ? a.getAssetCategory().getName() : "UNCLASSIFIED",
                        Collectors.counting()));

        return new UtilizationReportResponse(
                total, assigned, inStock, maintenance, disposed,
                Math.round(rate * 100.0) / 100.0,
                totalValue, idleValue, byStatus, byCategory
        );
    }
}
