package com.bimlab.asset.service;

import com.bimlab.asset.dto.response.DashboardSummaryResponse;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.ContractRepository;
import com.bimlab.asset.repository.PurchaseRequestRepository;
import com.bimlab.asset.repository.SubscriptionRepository;
import com.bimlab.asset.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private final AssetItemRepository assets;
    private final SubscriptionRepository subscriptions;
    private final VendorRepository vendors;
    private final PurchaseRequestRepository purchaseRequests;
    private final ContractRepository contracts;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getCounts() {
        return new DashboardSummaryResponse(
                assets.count(),
                subscriptions.count(),
                vendors.count(),
                purchaseRequests.count(),
                contracts.count()
        );
    }
}
