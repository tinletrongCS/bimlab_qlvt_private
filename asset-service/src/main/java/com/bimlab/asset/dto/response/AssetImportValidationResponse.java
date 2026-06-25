package com.bimlab.asset.dto.response;

import java.util.List;

public record AssetImportValidationResponse(
        String uploadStatus,
        Integer totalRows,
        Integer validRows,
        Integer errorRows,
        Integer warningRows,
        List<AssetImportRowResult> rows
) {}
