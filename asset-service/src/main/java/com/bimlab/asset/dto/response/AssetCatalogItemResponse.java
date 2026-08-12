package com.bimlab.asset.dto.response;

public record AssetCatalogItemResponse(
        Long id,
        String itemCode,
        String name,
        String catalogType,
        Long categoryId
) {}
