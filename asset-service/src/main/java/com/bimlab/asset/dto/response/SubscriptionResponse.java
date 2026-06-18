package com.bimlab.asset.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record SubscriptionResponse(
        Long id,
        AssetSummaryResponse asset,
        String softwareName,
        String planName,
        String licenseKey,
        Long ownerEmployeeId,
        VendorResponse vendor,
        Integer totalSeats,
        Integer usedSeats,
        BigDecimal cost,
        String billingCycle,
        LocalDate startDate,
        LocalDate renewalDate,
        String status,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
