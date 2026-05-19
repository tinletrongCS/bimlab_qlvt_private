package com.bimlab.asset.controller;

import com.bimlab.asset.dto.AssetTransferRequest;
import com.bimlab.asset.model.AssetTransfer;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.AssetManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset/transfers")
@RequiredArgsConstructor
public class AssetTransferController {
    private final AssetManagementService service;
    private final AssetAccessService access;

    @GetMapping public List<AssetTransfer> list() { access.ensureAccess(); return service.listTransfers(); }
    @GetMapping("/asset/{assetId}") public List<AssetTransfer> byAsset(@PathVariable Long assetId) { access.ensureAccess(); return service.listTransfersByAsset(assetId); }
    @GetMapping("/{id}") public AssetTransfer get(@PathVariable Long id) { access.ensureAccess(); return service.getTransfer(id); }
    @PostMapping public AssetTransfer create(@Valid @RequestBody AssetTransferRequest req) { access.ensureAssetManage(); return service.createTransfer(req); }
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id) { access.ensureAssetManage(); service.deleteTransfer(id); }
}
