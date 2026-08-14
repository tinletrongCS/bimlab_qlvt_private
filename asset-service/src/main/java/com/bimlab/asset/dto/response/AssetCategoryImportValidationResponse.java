package com.bimlab.asset.dto.response;

import java.util.List;

public record AssetCategoryImportValidationResponse(
        String uploadStatus,
        int totalRows,
        int validRows,
        int errorRows,
        int warningRows,
        List<AssetCategoryImportRowResult> rows
) {
}
