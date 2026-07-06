package com.bimlab.asset.dto.response;

import java.util.List;

public record AssetCategoryImportRowResult(
        Integer rowNumber,
        String status,
        String code,
        String name,
        String parentCode,
        String action,
        List<AssetCategoryImportMessageResponse> errors,
        List<AssetCategoryImportMessageResponse> warnings
) {
}
