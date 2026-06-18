package com.bimlab.asset.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AssetValueSnapshotRequest(
        @NotNull Long assetId,
        @NotNull LocalDate snapshotDate,
        @NotNull BigDecimal originalCost,
        BigDecimal periodDepreciation,
        BigDecimal accumulatedDepreciation,
        @NotNull BigDecimal bookValue,
        String source,
        String notes
) {}
