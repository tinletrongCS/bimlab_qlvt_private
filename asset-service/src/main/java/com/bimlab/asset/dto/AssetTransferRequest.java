package com.bimlab.asset.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
        // F5: restrict to https?:// or relative path; defensive against SSRF.
        @Size(max = 2048)
        @Pattern(
                regexp = "^$|^(https?://|/)[A-Za-z0-9._~:/?#@!$&'()*+,;=%\\-]{1,2047}$",
                message = "URL không hợp lệ"
        )
        String handoverDocumentUrl,
        Boolean applyToAsset
) {}
