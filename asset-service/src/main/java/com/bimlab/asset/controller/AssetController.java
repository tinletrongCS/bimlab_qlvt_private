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

    @GetMapping("/paged")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public Page<AssetItem> listPaged(@PageableDefault(size = 20) Pageable pageable) {
        return service.listAssetsPaged(pageable);
    }

    @GetMapping("{/id}")
    @PreAuthorize("hasAnyAuthority('asset_access', 'asset_view_self', 'asset_view_team', 'asset_view_all', 'asset_manage', 'asset_finance_manage')")
    public AssetItem get(@PathVariable Long id) {
        AssetItem item = service.getAssetById(id);
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

    /*
    TODO tính khấu hao theo từng danh mục tài sản -> để làm sau khi có công thức tính
     */
    @GetMapping("/{id}/depreciation")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public DepreciationSnapshot depreciation(@PathVariable Long id) {
        AssetItem item = service.getAssetById(id);
        access.ensureSelfOrAny(item.getAssignedEmployeeId(), Permission.Sets.ASSET_ADMIN);
        return service.calculateDepreciation(item);
    }

    @PostMapping("/{id}/dispose")
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetItem dispose(@PathVariable Long id, @Valid @RequestBody DisposeAssetRequest req) {
        return service.disposeAsset(id, req);
    }
}
