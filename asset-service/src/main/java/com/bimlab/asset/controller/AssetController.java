package com.bimlab.asset.controller;

import com.bimlab.asset.dto.AssetRequest;
import com.bimlab.asset.dto.DepreciationSnapshot;
import com.bimlab.asset.dto.DisposeAssetRequest;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.AssetManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset/assets")
@RequiredArgsConstructor
public class AssetController {
    private final AssetManagementService service;
    private final AssetAccessService access;

    @GetMapping public List<AssetItem> list() { access.ensureAccess(); return service.listAssets(); }

    // F1: object-level scoping — self-scoped users only see assets assigned to them.
    @GetMapping("/{id}") public AssetItem get(@PathVariable Long id) {
        access.ensureAccess();
        AssetItem item = service.getAsset(id);
        access.ensureSelfOrAny(item.getAssignedEmployeeId(), ASSET_ADMIN_PERMS);
        return item;
    }

    @PostMapping public AssetItem create(@Valid @RequestBody AssetRequest req) { access.ensureAssetManage(); return service.createAsset(req); }
    @PutMapping("/{id}") public AssetItem update(@PathVariable Long id, @Valid @RequestBody AssetRequest req) { access.ensureAssetManage(); return service.updateAsset(id, req); }
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id) { access.ensureAssetManage(); service.deleteAsset(id); }

    // F1: same scoping for depreciation snapshot (also exposes asset internals).
    @GetMapping("/{id}/depreciation") public DepreciationSnapshot depreciation(@PathVariable Long id) {
        access.ensureAccess();
        AssetItem item = service.getAsset(id);
        access.ensureSelfOrAny(item.getAssignedEmployeeId(), ASSET_ADMIN_PERMS);
        return service.calculateDepreciation(id);
    }

    @PostMapping("/{id}/dispose") public AssetItem dispose(@PathVariable Long id, @Valid @RequestBody DisposeAssetRequest req) { access.ensureAssetManage(); return service.disposeAsset(id, req); }

    private static final String[] ASSET_ADMIN_PERMS = {
            "asset_view_team", "asset_view_all", "asset_manage", "asset_finance_manage"
    };
}
