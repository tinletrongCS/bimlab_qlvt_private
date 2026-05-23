package com.bimlab.asset.controller;

import com.bimlab.asset.dto.AssetTransferRequest;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.AssetTransfer;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.security.Permission;
import com.bimlab.asset.service.AssetManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset/transfers")
@RequiredArgsConstructor
public class AssetTransferController {
    private final AssetManagementService service;
    private final AssetAccessService access;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<AssetTransfer> list() {
        return service.listTransfers();
    }

    // F1: scope by parent asset's owner.
    @GetMapping("/asset/{assetId}")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<AssetTransfer> byAsset(@PathVariable Long assetId) {
        AssetItem parent = service.getAsset(assetId);
        access.ensureSelfOrAny(parent.getAssignedEmployeeId(), Permission.Sets.TRANSFER_ADMIN);
        return service.listTransfersByAsset(assetId);
    }

    // F1: caller may be either party of the transfer, or admin.
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public AssetTransfer get(@PathVariable Long id) {
        AssetTransfer t = service.getTransfer(id);
        access.ensurePartyOrAny(t.getFromEmployeeId(), t.getToEmployeeId(), Permission.Sets.TRANSFER_ADMIN);
        return t;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetTransfer create(@Valid @RequestBody AssetTransferRequest req) {
        return service.createTransfer(req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('asset_manage')")
    public void delete(@PathVariable Long id) {
        service.deleteTransfer(id);
    }
}
