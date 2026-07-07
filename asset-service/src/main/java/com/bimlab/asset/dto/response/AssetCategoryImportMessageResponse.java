package com.bimlab.asset.dto.response;

public record AssetCategoryImportMessageResponse(
        String field,
        String code,
        String message
) {
}
