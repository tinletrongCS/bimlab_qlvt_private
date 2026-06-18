package com.bimlab.asset.dto.response;

public record DashboardSummaryResponse(
        long assets,
        long subscriptions,
        long vendors,
        long purchaseRequests,
        long contracts
) {}
