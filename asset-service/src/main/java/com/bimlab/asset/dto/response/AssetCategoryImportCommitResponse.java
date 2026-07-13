package com.bimlab.asset.dto.response;

import java.util.List;

public record AssetCategoryImportCommitResponse(
        String uploadStatus,
        int importedRows,
        int updatedRows,
        int skippedRows,
        int errorRows,
        List<AssetCategoryImportRowResult> rows
) {
}
