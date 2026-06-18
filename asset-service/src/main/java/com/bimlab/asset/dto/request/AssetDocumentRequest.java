package com.bimlab.asset.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AssetDocumentRequest(
        @NotNull Long assetId,
        String documentType,
        @NotBlank String fileName,
        @NotBlank String objectKey,
        String contentType,
        Long sizeBytes,
        String uploadedBy
) {}
