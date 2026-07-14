package com.bimlab.asset.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record AssetTransferHeaderResponse(
        Long id,
        String transferCode,
        String title,
        String transferType,
        String status,
        Long fromEmployeeId,
        Long toEmployeeId,
        Long fromDepartmentId,
        Long toDepartmentId,
        Long fromSiteId,
        Long toSiteId,
        Long fromProjectId,
        Long toProjectId,
        LocalDate transferDate,
        LocalDateTime plannedHandoverAt,
        String reason,
        String note,
        List<Line> lines
) {
    public record Line(
            Long id,
            Long assetId,
            String assetCode,
            String assetName,
            String lineStatus,
            String statusBefore,
            String statusAfter,
            String conditionBefore,
            BigDecimal bookValueAtTransfer,
            String receiverNote
    ) {}
}
