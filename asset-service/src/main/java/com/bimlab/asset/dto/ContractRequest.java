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
        // Q7: object key in MinIO bucket (preferred over attachmentUrl)
        @Size(max = 500) String attachmentObjectKey,
        String notes,
        Long assetId,
        Long documentId
) {
    public ContractRequest(
            String contractNumber,
            String title,
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
            String attachmentObjectKey,
            String notes
    ) {
        this(
                contractNumber, title, vendorId, purchaseRequestId, signDate,
                effectiveFrom, effectiveTo, contractValue, currency,
                paymentTerms, status, attachmentUrl, attachmentObjectKey,
                notes, null, null
        );
    }
}
