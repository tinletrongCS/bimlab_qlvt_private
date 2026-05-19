package com.bimlab.asset.controller;

import com.bimlab.asset.dto.UtilizationReport;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.ContractRepository;
import com.bimlab.asset.repository.PurchaseRequestRepository;
import com.bimlab.asset.repository.SubscriptionRepository;
import com.bimlab.asset.repository.VendorRepository;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.AssetManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/asset/dashboard")
@RequiredArgsConstructor
public class AssetDashboardController {
    private final AssetItemRepository assets;
    private final SubscriptionRepository subscriptions;
    private final VendorRepository vendors;
    private final PurchaseRequestRepository purchaseRequests;
    private final ContractRepository contracts;
    private final AssetManagementService service;
    private final AssetAccessService access;

    @GetMapping
    public Map<String, Long> summary() {
        access.ensureReportView();
        return Map.of(
                "assets", assets.count(),
                "subscriptions", subscriptions.count(),
                "vendors", vendors.count(),
                "purchaseRequests", purchaseRequests.count(),
                "contracts", contracts.count()
        );
    }

    @GetMapping("/utilization")
    public UtilizationReport utilization() {
        access.ensureReportView();
        return service.getUtilizationReport();
    }
}
