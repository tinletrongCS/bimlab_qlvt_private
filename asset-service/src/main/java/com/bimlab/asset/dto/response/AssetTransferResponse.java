package com.bimlab.asset.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AssetTransferResponse(
        Long id,
        AssetResponse asset,
        String transferType,
        Long fromEmployeeId,
        Long toEmployeeId,
        Long fromDepartmentId,
        Long toDepartmentId,
        Long fromSiteId,
        Long toSiteId,
        Long fromProjectId,
        Long toProjectId,
        LocalDate transferDate,
        String conditionBefore,
        String conditionAfter,
        String reason,
        String performedBy,
        String handoverDocumentUrl,
        AssetDocumentSummaryResponse handoverDocument,
        String approvedBy,
        LocalDateTime createdAt
) {}
