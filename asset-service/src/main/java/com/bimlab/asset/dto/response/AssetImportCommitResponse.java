package com.bimlab.asset.dto.response;

import java.util.List;

public record AssetImportCommitResponse(
        String uploadStatus,
        Integer importedRows,
        Integer skippedRows,
        Integer errorRows,
        List<AssetImportRowResult> rows
) {}
