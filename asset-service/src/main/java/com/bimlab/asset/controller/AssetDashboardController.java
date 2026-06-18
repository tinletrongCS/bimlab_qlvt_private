package com.bimlab.asset.controller;

import com.bimlab.asset.dto.response.DashboardSummaryResponse;
import com.bimlab.asset.dto.response.UtilizationReportResponse;
import com.bimlab.asset.service.AssetService;
import com.bimlab.asset.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Q2-followup N1: thin controller — count aggregation moved to {@link DashboardService};
 * utilization report continues to route through {@link AssetService}.
 */
@RestController
@RequestMapping("/api/asset/dashboard")
@RequiredArgsConstructor
public class AssetDashboardController {
    private final DashboardService dashboardService;
    private final AssetService assetService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_report_view','asset_view_all','asset_manage','asset_finance_manage')")
    public DashboardSummaryResponse summary() {
        return dashboardService.getCounts();
    }

    @GetMapping("/utilization")
    @PreAuthorize("hasAnyAuthority('asset_report_view','asset_view_all','asset_manage','asset_finance_manage')")
    public UtilizationReportResponse utilization() {
        return assetService.getUtilizationReport();
    }
}
