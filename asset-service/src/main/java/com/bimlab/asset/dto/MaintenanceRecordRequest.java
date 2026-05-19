package com.bimlab.asset.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record MaintenanceRecordRequest(
        @NotNull Long assetId,
        @NotBlank String maintenanceType,
        @NotNull LocalDate maintenanceDate,
        BigDecimal cost,
        Long vendorId,
        String performedBy,
        String description,
        LocalDate nextMaintenanceDate,
        String status
) {}
