package com.bimlab.asset.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record AssetImportValidateRequest(
        /*
        validate single row one by one
         */
        @NotNull @Valid List<AssetImportRowRequest> rows
) {}
