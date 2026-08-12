package com.bimlab.asset.dto.response;

import java.util.List;

/*
Tóm tắt thông tin về 1 lần upload danh sách tài sản từ file Excel
 */
public record AssetImportValidationResponse(
        String uploadStatus,
        Integer totalRows,
        Integer validRows,
        Integer errorRows,
        Integer warningRows,
        List<AssetImportRowResult> rows
) {}
