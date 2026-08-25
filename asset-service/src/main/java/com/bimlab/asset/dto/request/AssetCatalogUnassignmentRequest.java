package com.bimlab.asset.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;

import java.util.List;

public record AssetCatalogUnassignmentRequest(
        @NotEmpty List<@Positive Long> assetIds
) {}
