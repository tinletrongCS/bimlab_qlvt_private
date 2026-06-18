package com.bimlab.asset.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record PurchaseRequestResponse(
        Long id,
        String requestType,
        String title,
        String reason,
        BigDecimal estimatedCost,
        Long requesterEmployeeId,
        Long departmentId,
        Long siteId,
        Long projectId,
        LocalDate neededDate,
        String status,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
