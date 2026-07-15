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
        String requestedBy,
        Long requestedEmployeeId,
        String approvedBy,
        List<Confirmation> confirmations,
        List<Document> documents,
        List<Line> lines
) {
    public record Confirmation(
            Long id,
            Long confirmerEmployeeId,
            String confirmerUsername,
            String confirmerName,
            String confirmationRole,
            String status,
            LocalDateTime confirmedAt,
            String note
    ) {}

    public record Document(
            Long id,
            String documentType,
            String documentStatus,
            String fileName,
            String objectKey,
            String contentType,
            Long sizeBytes
    ) {}

    public record Line(
            Long id,
            Long assetId,
            String assetCode,
            String assetName,
            String lineStatus,
            Long fromEmployeeId,
            Long toEmployeeId,
            Long fromDepartmentId,
            Long toDepartmentId,
            Long fromSiteId,
            Long toSiteId,
            Long fromProjectId,
            Long toProjectId,
            String statusBefore,
            String statusAfter,
            String conditionBefore,
            BigDecimal bookValueAtTransfer,
            String receiverNote
    ) {}
}