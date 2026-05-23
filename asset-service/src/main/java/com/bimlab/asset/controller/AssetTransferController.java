package com.bimlab.asset.controller;

import com.bimlab.asset.dto.AssetTransferRequest;
import com.bimlab.asset.model.AssetItem;
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

    // F1: scope by parent asset's owner.
    @GetMapping("/asset/{assetId}") public List<AssetTransfer> byAsset(@PathVariable Long assetId) {
        access.ensureAccess();
        AssetItem parent = service.getAsset(assetId);
        access.ensureSelfOrAny(parent.getAssignedEmployeeId(), TRANSFER_ADMIN_PERMS);
        return service.listTransfersByAsset(assetId);
    }

    // F1: caller may be either party of the transfer, or admin.
    @GetMapping("/{id}") public AssetTransfer get(@PathVariable Long id) {
        access.ensureAccess();
        AssetTransfer t = service.getTransfer(id);
        access.ensurePartyOrAny(t.getFromEmployeeId(), t.getToEmployeeId(), TRANSFER_ADMIN_PERMS);
        return t;
    }

    @PostMapping public AssetTransfer create(@Valid @RequestBody AssetTransferRequest req) { access.ensureAssetManage(); return service.createTransfer(req); }
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id) { access.ensureAssetManage(); service.deleteTransfer(id); }

    private static final String[] TRANSFER_ADMIN_PERMS = {
            "asset_view_team", "asset_view_all", "asset_manage", "asset_finance_manage"
    };
}
