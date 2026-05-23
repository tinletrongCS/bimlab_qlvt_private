package com.bimlab.asset.controller;

import com.bimlab.asset.dto.MaintenanceRecordRequest;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.MaintenanceRecord;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.security.Permission;
import com.bimlab.asset.service.AssetManagementService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset/maintenance")
@RequiredArgsConstructor
@Validated
public class MaintenanceController {
    private final AssetManagementService service;
    private final AssetAccessService access;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<MaintenanceRecord> list() {
        return service.listMaintenanceRecords();
    }

    // F1: maintenance records inherit scope from parent asset.
    @GetMapping("/asset/{assetId}")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<MaintenanceRecord> byAsset(@PathVariable Long assetId) {
        AssetItem parent = service.getAsset(assetId);
        access.ensureSelfOrAny(parent.getAssignedEmployeeId(), Permission.Sets.MAINT_ADMIN);
        return service.listMaintenanceByAsset(assetId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public MaintenanceRecord get(@PathVariable Long id) {
        MaintenanceRecord rec = service.getMaintenanceRecord(id);
        Long ownerEmployeeId = rec.getAsset() != null ? rec.getAsset().getAssignedEmployeeId() : null;
        access.ensureSelfOrAny(ownerEmployeeId, Permission.Sets.MAINT_ADMIN);
        return rec;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('maintenance_manage','asset_manage')")
    public MaintenanceRecord create(@Valid @RequestBody MaintenanceRecordRequest req) {
        return service.createMaintenanceRecord(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('maintenance_manage','asset_manage')")
    public MaintenanceRecord update(@PathVariable Long id, @Valid @RequestBody MaintenanceRecordRequest req) {
        return service.updateMaintenanceRecord(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('maintenance_manage','asset_manage')")
    public void delete(@PathVariable Long id) {
        service.deleteMaintenanceRecord(id);
    }

    // F2: cap days to a sane range. Without this, days=Integer.MAX_VALUE triggers
    // assets.findAll() + in-JVM filter — trivial authenticated DoS at scale.
    @GetMapping("/warranty-expiring")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<AssetItem> warrantyExpiring(@RequestParam(defaultValue = "30") @Min(1) @Max(365) int days) {
        return service.listAssetsWithWarrantyExpiringWithin(days);
    }
}
