package com.bimlab.asset.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;

public record ContractRequest(
        @NotBlank String contractNumber,
        @NotBlank String title,
        Long vendorId,
        Long purchaseRequestId,
        LocalDate signDate,
        LocalDate effectiveFrom,
        LocalDate effectiveTo,
        BigDecimal contractValue,
        String currency,
        String paymentTerms,
        String status,
        String attachmentUrl,
        String notes
) {}
