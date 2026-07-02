package com.bimlab.asset.mapper;

import com.bimlab.asset.dto.response.AssetCatalogItemResponse;
import com.bimlab.asset.dto.response.AssetCategoryResponse;
import com.bimlab.asset.dto.response.AssetResponse;
import com.bimlab.asset.dto.response.AssetSummaryResponse;
import com.bimlab.asset.dto.response.VendorResponse;
import com.bimlab.asset.model.AssetCatalogItem;
import com.bimlab.asset.model.AssetCategory;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.Vendor;
import org.springframework.stereotype.Component;

@Component
public class AssetMapper {
    /*
    TODO Chú ý trong controller lúc gọi API không trả thằng về trong model
     */
    public AssetResponse toResponse(AssetItem asset) {
        return toResponse(asset, true);
    }

    /**
     * Map asset → response, che các trường tiền tệ khi caller không có quyền
     * xem tài chính ({@code Permission.Sets.FINANCE_VIEWERS}). Các trường bị
     * che trả về null: nguyên giá, giá mua, khấu hao lũy kế, giá trị sổ sách,
     * giá trị còn lại, tỷ lệ khấu hao, giá thanh lý.
     */
    public AssetResponse toResponse(AssetItem asset, boolean includeFinance) {
        return new AssetResponse(
                asset.getId(),
                asset.getAssetCode(),
                asset.getName(),
                toCatalogItemResponse(asset.getCatalogItem()),
                toCategoryResponse(asset.getAssetCategory()),
                asset.getCategory(),
                toSummaryResponse(asset.getParentAsset()),
                enumName(asset.getAssetClass()),
                enumName(asset.getFixedAssetType()),
                enumName(asset.getToolUsageType()),
                asset.getSerialNumber(),
                asset.getSource(),
                toVendorResponse(asset.getVendor()),
                asset.getAssignedEmployeeId(),
                asset.getDepartmentId(),
                asset.getSiteId(),
                asset.getProjectId(),
                asset.getPurchaseDate(),
                asset.getUseDate(),
                asset.getDepreciationStartDate(),
                asset.getWarrantyUntil(),
                includeFinance ? asset.getOriginalCost() : null,
                includeFinance ? asset.getPurchaseCost() : null,
                includeFinance ? asset.getAccumulatedDepreciation() : null,
                includeFinance ? asset.getBookValue() : null,
                includeFinance ? asset.getResidualValue() : null,
                asset.getDepreciationMethod(),
                asset.getUsefulLifeMonths(),
                asset.getUsefulLifeYears(),
                includeFinance ? asset.getDepreciationRate() : null,
                asset.getManufactureYear(),
                asset.getInstallationYear(),
                asset.getCountryCode(),
                asset.getCapacity(),
                asset.getCapacityUnit(),
                asset.getRealCapacity(),
                asset.getTechnicalDescription(),
                enumName(asset.getStatus()),
                asset.getDisposalDate(),
                includeFinance ? asset.getDisposalPrice() : null,
                asset.getDisposalReason(),
                asset.getNotes(),
                asset.getCreatedAt(),
                asset.getUpdatedAt()
        );
    }

    private AssetCategoryResponse toCategoryResponse(AssetCategory category) {
        if (category == null) return null;
        return new AssetCategoryResponse(
                category.getId(),
                category.getCode(),
                category.getName(),
                enumName(category.getAssetClass()),
                category.getParent() == null ? null : category.getParent().getId(),
                category.getDescription(),
                category.getActive()
        );
    }

    private AssetCatalogItemResponse toCatalogItemResponse(AssetCatalogItem item) {
        if (item == null) return null;
        return new AssetCatalogItemResponse(
                item.getId(),
                item.getItemCode(),
                item.getName(),
                enumName(item.getCatalogType()),
                item.getCategory() == null ? null : item.getCategory().getId()
        );
    }

    private AssetSummaryResponse toSummaryResponse(AssetItem asset) {
        if (asset == null) return null;
        return new AssetSummaryResponse(asset.getId(), asset.getAssetCode(), asset.getName());
    }

    public VendorResponse toVendorResponse(Vendor vendor) {
        if (vendor == null) return null;
        return new VendorResponse(
                vendor.getId(),
                vendor.getName(),
                vendor.getTaxCode(),
                vendor.getContactName(),
                vendor.getEmail(),
                vendor.getPhone(),
                vendor.getAddress(),
                enumName(vendor.getStatus())
        );
    }

    private String enumName(Enum<?> value) {
        return value == null ? null : value.name();
    }
}
