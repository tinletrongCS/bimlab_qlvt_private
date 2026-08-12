package com.bimlab.asset.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ContractResponse(
        Long id,
        String contractNumber,
        String title,
        VendorResponse vendor,
        PurchaseRequestResponse purchaseRequest,
        AssetSummaryResponse asset,
        LocalDate signDate,
        LocalDate effectiveFrom,
        LocalDate effectiveTo,
        BigDecimal contractValue,
        String currency,
        String paymentTerms,
        String status,
        String attachmentUrl,
        String attachmentObjectKey,
        Long documentId,
        String notes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
