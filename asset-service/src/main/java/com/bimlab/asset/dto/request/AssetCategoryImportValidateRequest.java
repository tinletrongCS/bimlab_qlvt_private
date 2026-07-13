package com.bimlab.asset.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record AssetCategoryImportValidateRequest(
        @NotEmpty List<@Valid AssetCategoryImportRowRequest> rows
) {
}
