package com.bimlab.asset.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;

public record PurchaseRequestRequest(
        @NotBlank String requestType,
        @NotBlank String title,
        String reason,
        BigDecimal estimatedCost,
        Long requesterEmployeeId,
        Long departmentId,
        Long siteId,
        Long projectId,
        LocalDate neededDate,
        String status,
        String notes
) {}
