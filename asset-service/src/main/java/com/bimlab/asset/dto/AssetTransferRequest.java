package com.bimlab.asset.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record AssetTransferRequest(
        @NotNull Long assetId,
        @NotBlank String transferType,
        Long fromEmployeeId,
        Long toEmployeeId,
        Long fromDepartmentId,
        Long toDepartmentId,
        Long fromSiteId,
        Long toSiteId,
        @NotNull LocalDate transferDate,
        String reason,
        String performedBy,
        String handoverDocumentUrl,
        Boolean applyToAsset
) {}
