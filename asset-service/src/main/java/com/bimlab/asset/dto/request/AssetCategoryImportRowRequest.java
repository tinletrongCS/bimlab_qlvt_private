package com.bimlab.asset.dto.request;

public record AssetCategoryImportRowRequest(
        Integer rowNumber,
        String group,
        String code,
        String name,
        String parentCode
) {
}