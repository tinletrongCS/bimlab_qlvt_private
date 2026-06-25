package com.bimlab.asset.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record AssetImportValidateRequest(
        @NotNull @Valid List<AssetImportRowRequest> rows
) {}
