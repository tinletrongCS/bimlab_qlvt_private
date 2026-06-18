package com.bimlab.asset.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AssetQrCodeRequest(
        @NotNull Long assetId,
        @NotBlank String qrPayload,
        String qrToken,
        String status,
        String printedBy
) {}
