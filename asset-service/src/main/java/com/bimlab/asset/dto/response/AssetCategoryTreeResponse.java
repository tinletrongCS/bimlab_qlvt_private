package com.bimlab.asset.dto.response;

import java.util.List;

public record AssetCategoryTreeResponse(
        Long id,
        String code,
        String name,
        String assetClass,
        Long parentId,
        String description,
        Boolean active,
        List<AssetCategoryTreeResponse> children
) {}
