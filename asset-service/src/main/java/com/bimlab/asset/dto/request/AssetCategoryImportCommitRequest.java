package com.bimlab.asset.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record AssetCategoryImportCommitRequest(
        @NotEmpty List<@Valid AssetCategoryImportRowRequest> rows
) {
}
