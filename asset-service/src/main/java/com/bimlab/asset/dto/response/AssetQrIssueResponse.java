package com.bimlab.asset.dto.response;

public record AssetQrIssueResponse(
        Long assetId,
        String assetCode,
        String assetName,
        String token,
        String publicUrl
) {}
