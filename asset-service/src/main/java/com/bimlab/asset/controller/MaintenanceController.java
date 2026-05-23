package com.bimlab.asset.controller;

import com.bimlab.asset.dto.MaintenanceRecordRequest;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.MaintenanceRecord;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.AssetManagementService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
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

    @GetMapping public List<MaintenanceRecord> list() { access.ensureAccess(); return service.listMaintenanceRecords(); }

    // F1: maintenance records inherit scope from parent asset.
    @GetMapping("/asset/{assetId}") public List<MaintenanceRecord> byAsset(@PathVariable Long assetId) {
        access.ensureAccess();
        AssetItem parent = service.getAsset(assetId);
        access.ensureSelfOrAny(parent.getAssignedEmployeeId(), MAINT_ADMIN_PERMS);
        return service.listMaintenanceByAsset(assetId);
    }

    @GetMapping("/{id}") public MaintenanceRecord get(@PathVariable Long id) {
        access.ensureAccess();
        MaintenanceRecord rec = service.getMaintenanceRecord(id);
        Long ownerEmployeeId = rec.getAsset() != null ? rec.getAsset().getAssignedEmployeeId() : null;
        access.ensureSelfOrAny(ownerEmployeeId, MAINT_ADMIN_PERMS);
        return rec;
    }
    @PostMapping public MaintenanceRecord create(@Valid @RequestBody MaintenanceRecordRequest req) { access.ensureMaintenanceManage(); return service.createMaintenanceRecord(req); }
    @PutMapping("/{id}") public MaintenanceRecord update(@PathVariable Long id, @Valid @RequestBody MaintenanceRecordRequest req) { access.ensureMaintenanceManage(); return service.updateMaintenanceRecord(id, req); }
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id) { access.ensureMaintenanceManage(); service.deleteMaintenanceRecord(id); }

    // F2: cap days to a sane range. Without this, days=Integer.MAX_VALUE triggers
    // assets.findAll() + in-JVM filter — trivial authenticated DoS at scale.
    @GetMapping("/warranty-expiring") public List<AssetItem> warrantyExpiring(@RequestParam(defaultValue = "30") @Min(1) @Max(365) int days) { access.ensureAccess(); return service.listAssetsWithWarrantyExpiringWithin(days); }

    private static final String[] MAINT_ADMIN_PERMS = {
            "maintenance_manage", "asset_manage", "asset_view_team", "asset_view_all"
    };
}
