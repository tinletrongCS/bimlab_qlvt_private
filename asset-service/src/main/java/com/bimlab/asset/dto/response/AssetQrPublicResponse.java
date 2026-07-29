package com.bimlab.asset.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record AssetQrPublicResponse(
        String assetCode,
        String name,
        String status,
        String serialNumber,
        String categoryName,
        String categoryCode,
        String assetClass,
        String technicalDescription,
        Long assignedEmployeeId,
        String assignedEmployeeName,
        Long departmentId,
        String departmentName,
        Long siteId,
        String siteName,
        Long projectId,
        LocalDate useDate,
        LocalDate purchaseDate,
        LocalDate warrantyUntil,
        String vendorName,
        BigDecimal originalCost,
        String source,
        LocalDateTime updatedAt,
        List<TransferHistory> transferHistory
) {
    public record TransferHistory(
            String transferCode,
            String transferType,
            String status,
            LocalDate transferDate,
            Long fromEmployeeId,
            Long toEmployeeId,
            Long fromDepartmentId,
            Long toDepartmentId,
            Long fromSiteId,
            Long toSiteId,
            String conditionBefore,
            String conditionAfter
    ) {}
}
