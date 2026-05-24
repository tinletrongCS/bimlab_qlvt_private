package com.bimlab.asset.service;

import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.ContractRepository;
import com.bimlab.asset.repository.PurchaseRequestRepository;
import com.bimlab.asset.repository.SubscriptionRepository;
import com.bimlab.asset.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Q2-followup N1: dashboard counts extracted out of {@link com.bimlab.asset.controller.AssetDashboardController}
 * so the controller no longer wires 5 repositories directly. Owns simple
 * cross-domain count aggregation only — heavier utilization reporting stays
 * in {@link AssetService}.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {
    private final AssetItemRepository assets;
    private final SubscriptionRepository subscriptions;
    private final VendorRepository vendors;
    private final PurchaseRequestRepository purchaseRequests;
    private final ContractRepository contracts;

    @Transactional(readOnly = true)
    public Map<String, Long> getCounts() {
        return Map.of(
                "assets", assets.count(),
                "subscriptions", subscriptions.count(),
                "vendors", vendors.count(),
                "purchaseRequests", purchaseRequests.count(),
                "contracts", contracts.count()
        );
    }
}
