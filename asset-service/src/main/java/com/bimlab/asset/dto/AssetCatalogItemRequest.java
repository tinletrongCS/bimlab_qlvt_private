package com.bimlab.asset.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record AssetCatalogItemRequest(
        @NotBlank String itemCode,
        @NotBlank String name,
        Long categoryId,
        @NotBlank String catalogType,
        String inventoryGroup,
        String unit,
        BigDecimal costValue,
        BigDecimal standardValue,
        BigDecimal fixedValue,
        BigDecimal internalValue,
        String technicalSpec,
        Boolean active
) {}
