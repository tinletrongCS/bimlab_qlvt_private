package com.bimlab.asset.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
        // F5: restrict to https?:// or relative path; defensive against SSRF if
        // a future server-side renderer/fetcher consumes this field.
        @Size(max = 2048)
        @Pattern(
                regexp = "^$|^(https?://|/)[A-Za-z0-9._~:/?#@!$&'()*+,;=%\\-]{1,2047}$",
                message = "URL không hợp lệ"
        )
        String attachmentUrl,
        String notes
) {}
