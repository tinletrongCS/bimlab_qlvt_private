package com.bimlab.asset.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import com.bimlab.asset.dto.request.MaintenanceRecordRequest;
import com.bimlab.asset.dto.response.AssetResponse;
import com.bimlab.asset.dto.response.MaintenanceRecordResponse;
import com.bimlab.asset.mapper.AssetMapper;
import com.bimlab.asset.mapper.MaintenanceRecordMapper;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.MaintenanceRecord;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.security.Permission;
import com.bimlab.asset.service.AssetService;
import com.bimlab.asset.service.MaintenanceService;
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
    private final MaintenanceService service;
    private final AssetService assetService;
    private final AssetAccessService access;
    private final MaintenanceRecordMapper mapper;
    private final AssetMapper assetMapper;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<MaintenanceRecordResponse> list() {
        return service.listMaintenanceRecords().stream().map(mapper::toResponse).toList();
    }

    // Legacy GET without /paged remains compatible and returns List<MaintenanceRecord>.
    @GetMapping("/paged")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public Page<MaintenanceRecordResponse> listPaged(@PageableDefault(size = 20) Pageable pageable) {
        return service.listMaintenanceRecordsPaged(pageable).map(mapper::toResponse);
    }


    // Maintenance records inherit scope from parent asset.
    @GetMapping("/asset/{assetId}")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<MaintenanceRecordResponse> byAsset(@PathVariable Long assetId) {
        AssetItem parent = assetService.getAsset(assetId);
        access.ensureSelfOrAny(parent.getAssignedEmployeeId(), Permission.Sets.MAINT_ADMIN);
        return service.listMaintenanceByAsset(assetId).stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public MaintenanceRecordResponse get(@PathVariable Long id) {
        MaintenanceRecord rec = service.getMaintenanceRecord(id);
        Long ownerEmployeeId = rec.getAsset() != null ? rec.getAsset().getAssignedEmployeeId() : null;
        access.ensureSelfOrAny(ownerEmployeeId, Permission.Sets.MAINT_ADMIN);
        return mapper.toResponse(rec);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('maintenance_manage','asset_manage')")
    public MaintenanceRecordResponse create(@Valid @RequestBody MaintenanceRecordRequest req) {
        return mapper.toResponse(service.createMaintenanceRecord(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('maintenance_manage','asset_manage')")
    public MaintenanceRecordResponse update(@PathVariable Long id, @Valid @RequestBody MaintenanceRecordRequest req) {
        return mapper.toResponse(service.updateMaintenanceRecord(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('maintenance_manage','asset_manage')")
    public void delete(@PathVariable Long id) {
        service.deleteMaintenanceRecord(id);
    }

    // Cap days to a sane range. Warranty-expiring is an asset-domain query
    // exposed via the maintenance controller for FE convenience.
    @GetMapping("/warranty-expiring")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage','asset_finance_view')")
    public List<AssetResponse> warrantyExpiring(
            @RequestParam(defaultValue = "30") @Min(1) @Max(365) int days
    ) {
        boolean finance = access.hasAnyPermission(
                Permission.Sets.FINANCE_VIEWERS.toArray(Permission[]::new));
        return assetService.listAssetsWithWarrantyExpiringWithin(days)
                .stream()
                .map(a -> assetMapper.toResponse(a, finance))
                .toList();
    }
}
