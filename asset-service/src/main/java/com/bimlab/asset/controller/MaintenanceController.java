package com.bimlab.asset.controller;

import com.bimlab.asset.dto.MaintenanceRecordRequest;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.MaintenanceRecord;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.AssetManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset/maintenance")
@RequiredArgsConstructor
public class MaintenanceController {
    private final AssetManagementService service;
    private final AssetAccessService access;

    @GetMapping public List<MaintenanceRecord> list() { access.ensureAccess(); return service.listMaintenanceRecords(); }
    @GetMapping("/asset/{assetId}") public List<MaintenanceRecord> byAsset(@PathVariable Long assetId) { access.ensureAccess(); return service.listMaintenanceByAsset(assetId); }
    @GetMapping("/{id}") public MaintenanceRecord get(@PathVariable Long id) { access.ensureAccess(); return service.getMaintenanceRecord(id); }
    @PostMapping public MaintenanceRecord create(@Valid @RequestBody MaintenanceRecordRequest req) { access.ensureMaintenanceManage(); return service.createMaintenanceRecord(req); }
    @PutMapping("/{id}") public MaintenanceRecord update(@PathVariable Long id, @Valid @RequestBody MaintenanceRecordRequest req) { access.ensureMaintenanceManage(); return service.updateMaintenanceRecord(id, req); }
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id) { access.ensureMaintenanceManage(); service.deleteMaintenanceRecord(id); }

    @GetMapping("/warranty-expiring") public List<AssetItem> warrantyExpiring(@RequestParam(defaultValue = "30") int days) { access.ensureAccess(); return service.listAssetsWithWarrantyExpiringWithin(days); }
}
