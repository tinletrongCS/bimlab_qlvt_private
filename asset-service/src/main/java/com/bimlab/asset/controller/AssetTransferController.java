package com.bimlab.asset.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import com.bimlab.asset.dto.request.AssetTransferRequest;
import com.bimlab.asset.dto.response.AssetTransferResponse;
import com.bimlab.asset.mapper.AssetTransferMapper;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.AssetTransfer;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.security.Permission;
import com.bimlab.asset.service.AssetService;
import com.bimlab.asset.service.AssetTransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset/transfers")
@RequiredArgsConstructor
public class AssetTransferController {
    private final AssetTransferService service;
    private final AssetService assetService;
    private final AssetAccessService access;
    private final AssetTransferMapper mapper;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<AssetTransferResponse> list() {
        return service.listTransfers().stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/paged")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public Page<AssetTransferResponse> listPaged(@PageableDefault(size = 20) Pageable pageable) {
        return service.listTransfersPaged(pageable).map(mapper::toResponse);
    }


    @GetMapping("/asset/{assetId}")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<AssetTransferResponse> byAsset(@PathVariable Long assetId) {
        AssetItem parent = assetService.getAsset(assetId);
        access.ensureSelfOrAny(parent.getAssignedEmployeeId(), Permission.Sets.TRANSFER_ADMIN);
        return service.listTransfersByAsset(assetId).stream().map(mapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public AssetTransferResponse get(@PathVariable Long id) {
        AssetTransfer t = service.getTransfer(id);
        access.ensurePartyOrAny(t.getFromEmployeeId(), t.getToEmployeeId(), Permission.Sets.TRANSFER_ADMIN);
        return mapper.toResponse(t);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetTransferResponse create(@Valid @RequestBody AssetTransferRequest req) {
        AssetTransfer transfer = service.createTransfer(req);
        access.ensurePartyOrAny(transfer.getFromEmployeeId(), transfer.getToEmployeeId(), Permission.Sets.TRANSFER_ADMIN);
        return mapper.toResponse(transfer);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('asset_manage')")
    public void delete(@PathVariable Long id) {
        service.deleteTransfer(id);
    }
}
