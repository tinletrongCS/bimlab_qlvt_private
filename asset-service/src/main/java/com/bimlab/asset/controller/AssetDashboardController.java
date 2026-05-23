package com.bimlab.asset.controller;

import com.bimlab.asset.dto.UtilizationReport;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.ContractRepository;
import com.bimlab.asset.repository.PurchaseRequestRepository;
import com.bimlab.asset.repository.SubscriptionRepository;
import com.bimlab.asset.repository.VendorRepository;
import com.bimlab.asset.service.AssetService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Q2: dashboard reads simple counts from repos directly (pre-existing
 * architecture choice) and routes the structural utilization report
 * through {@link AssetService}, which owns asset-domain aggregations.
 */
@RestController
@RequestMapping("/api/asset/dashboard")
@RequiredArgsConstructor
public class AssetDashboardController {
    private final AssetItemRepository assets;
    private final SubscriptionRepository subscriptions;
    private final VendorRepository vendors;
    private final PurchaseRequestRepository purchaseRequests;
    private final ContractRepository contracts;
    private final AssetService assetService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_report_view','asset_view_all','asset_manage','asset_finance_manage')")
    public Map<String, Long> summary() {
        return Map.of(
                "assets", assets.count(),
                "subscriptions", subscriptions.count(),
                "vendors", vendors.count(),
                "purchaseRequests", purchaseRequests.count(),
                "contracts", contracts.count()
        );
    }

    @GetMapping("/utilization")
    @PreAuthorize("hasAnyAuthority('asset_report_view','asset_view_all','asset_manage','asset_finance_manage')")
    public UtilizationReport utilization() {
        return assetService.getUtilizationReport();
    }
}
