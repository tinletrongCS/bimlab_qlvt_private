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
        Boolean active
) {}
