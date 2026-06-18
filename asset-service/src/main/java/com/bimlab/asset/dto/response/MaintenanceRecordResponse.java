package com.bimlab.asset.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record MaintenanceRecordResponse(
        Long id,
        AssetResponse asset,
        String maintenanceType,
        LocalDate maintenanceDate,
        BigDecimal cost,
        VendorResponse vendor,
        String performedBy,
        String description,
        LocalDate nextMaintenanceDate,
        BigDecimal downtimeHours,
        BigDecimal meterReading,
        String conditionAfter,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
