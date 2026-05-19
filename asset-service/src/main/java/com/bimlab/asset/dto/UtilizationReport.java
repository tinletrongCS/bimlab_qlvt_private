package com.bimlab.asset.dto;

import java.math.BigDecimal;
import java.util.Map;

public record UtilizationReport(
        long totalAssets,
        long assignedAssets,
        long idleAssets,
        long maintenanceAssets,
        long disposedAssets,
        double utilizationRate,
        BigDecimal totalPurchaseValue,
        BigDecimal totalIdleValue,
        Map<String, Long> byStatus,
        Map<String, Long> byCategory
) {}
