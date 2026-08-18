package com.bimlab.asset.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

public record AssetCatalogAssignmentRequest(
        @NotEmpty List<@Positive Long> assetIds,
        @NotNull @Positive Long catalogItemId
) {}
