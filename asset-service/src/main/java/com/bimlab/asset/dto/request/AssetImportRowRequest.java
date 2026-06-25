package com.bimlab.asset.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AssetImportRowRequest(
        Integer rowNumber,
        String assetCode,
        String name,
        String assetClass,
        String classType,
        String categoryCode,
        String departmentName,
        String siteName,
        String catalogItemCode,
        String depreciationMethod,
        String serialNumber,
        LocalDate depreciationStartDate,
        LocalDate useDate,
        Integer usefulLifeMonths,
        BigDecimal originalCost,
        BigDecimal bookValue,
        String status,
        String countryCode,
        Integer manufactureYear,
        Integer installationYear,
        String technicalDescription
) {}
