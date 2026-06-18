package com.bimlab.asset.dto.response;

public record FileUploadResponse(
        String fileKey,
        String downloadUrl
) {}
