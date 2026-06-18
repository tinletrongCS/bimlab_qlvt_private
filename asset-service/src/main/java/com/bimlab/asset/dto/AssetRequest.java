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
        String notes,
        Long catalogItemId,
        Long categoryId,
        Long parentAssetId,
        String assetClass,
        String fixedAssetType,
        String toolUsageType,
        LocalDate useDate,
        LocalDate depreciationStartDate,
        BigDecimal originalCost,
        BigDecimal accumulatedDepreciation,
        BigDecimal bookValue,
        Integer usefulLifeMonths,
        BigDecimal depreciationRate,
        Integer manufactureYear,
        Integer installationYear,
        String countryCode,
        BigDecimal capacity,
        String capacityUnit,
        BigDecimal realCapacity,
        String technicalDescription
) {
    public AssetRequest(
            String assetCode,
            String name,
            String category,
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
    ) {
        this(
                assetCode, name, category, serialNumber, source, vendorId,
                assignedEmployeeId, departmentId, siteId, projectId,
                purchaseCost, residualValue, purchaseDate, warrantyUntil,
                status, depreciationMethod, usefulLifeYears, notes,
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, null, null
        );
    }
}
