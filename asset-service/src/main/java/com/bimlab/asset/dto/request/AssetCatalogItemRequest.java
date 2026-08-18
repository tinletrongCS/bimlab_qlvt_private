package com.bimlab.asset.dto.request;

import com.bimlab.asset.entity.status.CatalogType;
import com.bimlab.asset.entity.status.CatalogUnit;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record AssetCatalogItemRequest(
        @NotBlank @Size(max = 255) String name,
        @NotNull @Positive Long categoryId,
        @NotNull CatalogType catalogType,
        @Size(max = 120) String inventoryGroup,
        CatalogUnit unit,
        @PositiveOrZero BigDecimal costValue,
        @PositiveOrZero BigDecimal standardValue,
        @PositiveOrZero BigDecimal fixedValue,
        @PositiveOrZero BigDecimal internalValue,
        @Size(max = 1000) String technicalSpec,
        Boolean active
) {}
