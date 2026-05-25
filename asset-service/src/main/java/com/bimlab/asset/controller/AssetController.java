package com.bimlab.asset.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import com.bimlab.asset.dto.AssetRequest;
import com.bimlab.asset.dto.DepreciationSnapshot;
import com.bimlab.asset.dto.DisposeAssetRequest;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.security.Permission;
import com.bimlab.asset.service.AssetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Q1: declarative permissions via {@code @PreAuthorize}; object-context
 * endpoints retain imperative {@code ensureSelfOrAny} after entity load.
 * Q2: depends on {@link AssetService} only (was the monolith).
 */
@RestController
@RequestMapping("/api/asset/assets")
@RequiredArgsConstructor
public class AssetController {
    private final AssetService service;
    private final AssetAccessService access;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<AssetItem> list() {
        return service.listAssets();
    }

    // N4: paginated list — backward-compatible with legacy GET (no /paged) which still returns List<AssetItem>.
    @GetMapping("/paged")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public Page<AssetItem> listPaged(@PageableDefault(size = 20) Pageable pageable) {
        return service.listAssetsPaged(pageable);
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

    // F1: same scoping for depreciation snapshot.
    // Q2-followup N3: pass the loaded item to avoid a second DB roundtrip and
    // close the TOCTOU window where the asset could mutate between the access
    // check and the depreciation computation.
    @GetMapping("/{id}/depreciation")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public DepreciationSnapshot depreciation(@PathVariable Long id) {
        AssetItem item = service.getAsset(id);
        access.ensureSelfOrAny(item.getAssignedEmployeeId(), Permission.Sets.ASSET_ADMIN);
        return service.calculateDepreciation(item);
    }

    @PostMapping("/{id}/dispose")
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetItem dispose(@PathVariable Long id, @Valid @RequestBody DisposeAssetRequest req) {
        return service.disposeAsset(id, req);
    }
}
