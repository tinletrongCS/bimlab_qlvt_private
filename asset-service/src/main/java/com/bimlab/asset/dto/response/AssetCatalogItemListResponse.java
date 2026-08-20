package com.bimlab.asset.dto.response;

import com.bimlab.asset.entity.status.CatalogType;

public record AssetCatalogItemListResponse(
        Long id,
        String itemCode,
        String name,
        CatalogType catalogType,
        Long categoryId,
        String categoryCode,
        String categoryName,
        String unit,
        Boolean active,
        Long assetCount
) {
    public AssetCatalogItemListResponse(
            Long id,
            String itemCode,
            String name,
            CatalogType catalogType,
            Long categoryId,
            String categoryCode,
            String categoryName,
            String unit,
            Boolean active
    ) {
        this(id, itemCode, name, catalogType, categoryId, categoryCode, categoryName, unit, active, 0L);
    }

    public AssetCatalogItemListResponse withAssetCount(Long count) {
        return new AssetCatalogItemListResponse(
                id, itemCode, name, catalogType, categoryId, categoryCode, categoryName, unit, active, count
        );
    }
}
