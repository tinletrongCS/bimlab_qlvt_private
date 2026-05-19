package com.bimlab.asset.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;

public record AssetRequest(
        @NotBlank String assetCode,
        @NotBlank String name,
        @NotBlank String category,
        String serialNumber,
        String source,
        Long vendorId,
        Long assignedEmployeeId,
        Long departmentId,
        Long siteId,
        Long projectId,
        BigDecimal purchaseCost,
        BigDecimal residualValue,
        LocalDate purchaseDate,
        LocalDate warrantyUntil,
        String status,
        String depreciationMethod,
        Integer usefulLifeYears,
        String notes
) {}
