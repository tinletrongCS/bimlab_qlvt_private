package com.bimlab.asset.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;

public record SubscriptionRequest(
        @NotBlank String softwareName,
        String planName,
        Long vendorId,
        Integer totalSeats,
        Integer usedSeats,
        BigDecimal cost,
        String billingCycle,
        LocalDate startDate,
        LocalDate renewalDate,
        String status,
        String notes,
        Long assetId,
        String licenseKey,
        Long ownerEmployeeId
) {
    public SubscriptionRequest(
            String softwareName,
            String planName,
            Long vendorId,
            Integer totalSeats,
            Integer usedSeats,
            BigDecimal cost,
            String billingCycle,
            LocalDate startDate,
            LocalDate renewalDate,
            String status,
            String notes
    ) {
        this(
                softwareName, planName, vendorId, totalSeats, usedSeats,
                cost, billingCycle, startDate, renewalDate, status, notes,
                null, null, null
        );
    }
}
