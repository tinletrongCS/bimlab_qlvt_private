package com.bimlab.asset.controller;

import com.bimlab.asset.dto.AssetRequest;
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
    @GetMapping("/{id}") public AssetItem get(@PathVariable Long id) { access.ensureAccess(); return service.getAsset(id); }
    @PostMapping public AssetItem create(@Valid @RequestBody AssetRequest req) { access.ensureAssetManage(); return service.createAsset(req); }
    @PutMapping("/{id}") public AssetItem update(@PathVariable Long id, @Valid @RequestBody AssetRequest req) { access.ensureAssetManage(); return service.updateAsset(id, req); }
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id) { access.ensureAssetManage(); service.deleteAsset(id); }
}
