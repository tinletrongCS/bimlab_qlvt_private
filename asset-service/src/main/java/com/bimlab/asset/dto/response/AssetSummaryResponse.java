package com.bimlab.asset.dto.response;

public record AssetSummaryResponse(
        Long id,
        String assetCode,
        String name
) {}
