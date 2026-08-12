package com.bimlab.asset.dto.response;

import java.math.BigDecimal;
import java.util.Map;

public record UtilizationReportResponse(
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
