package com.bimlab.asset.dto.response;

public record AssetCategoryResponse(
        Long id,
        String code,
        String name,
        String assetClass,
        Long parentId,
        Boolean active
) {}
