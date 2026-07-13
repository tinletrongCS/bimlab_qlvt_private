package com.bimlab.asset.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bimlab.asset.dto.response.AuditLogResponse;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.security.Permission;
import com.bimlab.asset.service.AssetService;
import com.bimlab.asset.service.AuditLogService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/asset/logs")
@RequiredArgsConstructor
public class AuditLogController {
    private final AuditLogService service;
    private final AssetService assetService;
    private final AssetAccessService access;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_manage','asset_report_view','asset_finance_manage')")
    public Page<AuditLogResponse> byEntity(
            @RequestParam String entityType,
            @RequestParam Long entityId,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return service.listByEntity(entityType, entityId, pageable);
    }

    @GetMapping("assets/{assetId}")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_report_view','asset_finance_manage')")
    public Page<AuditLogResponse> byAsset(@PathVariable Long assetId, @PageableDefault(size = 20) Pageable pageable) {
        AssetItem assetItem = assetService.getAssetById(assetId);
        access.ensureSelfOrAny(assetItem.getAssignedEmployeeId(), Permission.Sets.ASSET_ADMIN);
        return service.listByEntity(AuditLogService.ENTITY_ASSET, assetId, pageable);
    }
}