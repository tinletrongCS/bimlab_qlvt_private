package com.bimlab.asset.dto.response;

import java.math.BigDecimal;

public record DepreciationSnapshot(
        Long assetId,
        String method,
        Integer usefulLifeYears,
        BigDecimal purchaseCost,
        BigDecimal residualValue,
        BigDecimal annualDepreciation,
        BigDecimal accumulatedDepreciation,
        BigDecimal bookValue,
        Integer yearsElapsed
) {}
