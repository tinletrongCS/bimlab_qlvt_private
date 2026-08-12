package com.bimlab.asset.dto.response;

public record AssetDocumentSummaryResponse(
        Long id,
        String documentType,
        String fileName,
        String objectKey
) {}
