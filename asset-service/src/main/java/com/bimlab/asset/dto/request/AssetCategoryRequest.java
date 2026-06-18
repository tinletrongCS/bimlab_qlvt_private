package com.bimlab.asset.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AssetCategoryRequest(
        @NotBlank String code,
        @NotBlank String name,
        Long parentId,
        @NotBlank String assetClass,
        String description,
        @NotNull Boolean active
) {}
