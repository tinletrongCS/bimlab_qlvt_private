package com.bimlab.asset.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record AssetTransferHeaderRequest(
        String transferCode,
        String title,
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
        LocalDateTime plannedHandoverAt,
        String reason,
        String note,
        // chưa danh sách id của các người dùng được phép xét duyệt
        List<Long> approverEmployeeIds,
        List<Document> documents,
        List<Line> lines
) {
    public record Document(
            String fileName,
            String objectKey,
            String contentType,
            Long sizeBytes
    ) {}

    public record Line(
            Long assetId,
            String conditionBefore,
            BigDecimal bookValueAtTransfer,
            String receiverNote
    ) {}
}
