package com.bimlab.asset.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record AssetImportCommitRequest(
        @NotBlank String importMode,
        @NotNull @Valid List<AssetImportRowRequest> rows
) {}
