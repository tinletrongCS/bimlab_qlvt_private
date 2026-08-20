package com.bimlab.asset.dto.response;

import com.bimlab.asset.entity.status.CatalogType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AssetCatalogItemDetailResponse(
        Long id,
        String itemCode,
        String name,
        CatalogType catalogType,
        Long categoryId,
        String categoryCode,
        String categoryName,
        String inventoryGroup,
        String unit,
        BigDecimal costValue,
        BigDecimal standardValue,
        BigDecimal fixedValue,
        BigDecimal internalValue,
        String technicalSpec,
        Boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
