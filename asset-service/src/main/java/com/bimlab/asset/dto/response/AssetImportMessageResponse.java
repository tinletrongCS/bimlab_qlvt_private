package com.bimlab.asset.dto.response;

public record AssetImportMessageResponse(
        String field,
        String code,
        String message
) {}
