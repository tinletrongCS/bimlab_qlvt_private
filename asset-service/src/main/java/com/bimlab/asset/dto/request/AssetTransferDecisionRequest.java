package com.bimlab.asset.dto.request;

public record AssetTransferDecisionRequest(
        String reason,
        String note
) {}