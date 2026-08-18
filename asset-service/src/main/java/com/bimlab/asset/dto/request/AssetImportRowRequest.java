package com.bimlab.asset.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AssetImportRowRequest(
        /*
        dòng gốc trong Excel do frontend đã truyền vào từ JSON
         */
        Integer rowNumber,
        Integer quantity,
        String assetCode,
        String contractNumber,
        String invoiceNumber,
        String name,
        String assetClass,
        String classType,
        String categoryCode,
        String departmentName,
        String siteName,
        String catalogItemCode,
        String depreciationMethod,
        String serialNumber,
        LocalDate purchaseDate,
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
