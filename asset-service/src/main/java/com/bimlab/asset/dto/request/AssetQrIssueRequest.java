package com.bimlab.asset.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record AssetQrIssueRequest(
        @NotEmpty List<@NotNull Long> assetIds
) {}
