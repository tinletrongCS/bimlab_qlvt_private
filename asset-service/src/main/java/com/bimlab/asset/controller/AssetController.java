package com.bimlab.asset.controller;

import com.bimlab.asset.dto.AssetRequest;
import com.bimlab.asset.dto.DepreciationSnapshot;
import com.bimlab.asset.dto.DisposeAssetRequest;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.security.Permission;
import com.bimlab.asset.service.AssetManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Q1: non-object-context gates are declarative via {@code @PreAuthorize}.
 * Object-context endpoints (GET /{id}, GET /{id}/depreciation) keep the
 * declarative broad-read gate plus an imperative {@code ensureSelfOrAny}
 * check after loading the entity — SpEL cannot reach
 * {@code item.assignedEmployeeId} before the method body executes.
 *
 * <p>Authority strings in {@code @PreAuthorize} are locked against the
 * {@link Permission} enum by {@code PermissionTest}.
 */
@RestController
@RequestMapping("/api/asset/assets")
@RequiredArgsConstructor
public class AssetController {
    private final AssetManagementService service;
    private final AssetAccessService access;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<AssetItem> list() {
        return service.listAssets();
    }

    // F1: object-level scoping — self-scoped users only see assets assigned to them.
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public AssetItem get(@PathVariable Long id) {
        AssetItem item = service.getAsset(id);
        access.ensureSelfOrAny(item.getAssignedEmployeeId(), Permission.Sets.ASSET_ADMIN);
        return item;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetItem create(@Valid @RequestBody AssetRequest req) {
        return service.createAsset(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetItem update(@PathVariable Long id, @Valid @RequestBody AssetRequest req) {
        return service.updateAsset(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('asset_manage')")
    public void delete(@PathVariable Long id) {
        service.deleteAsset(id);
    }

    // F1: same scoping for depreciation snapshot (also exposes asset internals).
    @GetMapping("/{id}/depreciation")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public DepreciationSnapshot depreciation(@PathVariable Long id) {
        AssetItem item = service.getAsset(id);
        access.ensureSelfOrAny(item.getAssignedEmployeeId(), Permission.Sets.ASSET_ADMIN);
        return service.calculateDepreciation(id);
    }

    @PostMapping("/{id}/dispose")
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetItem dispose(@PathVariable Long id, @Valid @RequestBody DisposeAssetRequest req) {
        return service.disposeAsset(id, req);
    }
}
