package com.bimlab.asset.dto.response;

import java.util.List;

public record AssetImportRowResult(
        Integer rowNumber,
        String status,
        String assetName,
        String categoryCode,
        String generatedAssetCodePreview,
        List<AssetImportMessageResponse> errors,
        List<AssetImportMessageResponse> warnings
) {}
