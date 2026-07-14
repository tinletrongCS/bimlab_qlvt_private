package com.bimlab.asset.controller;

import com.bimlab.asset.dto.request.AssetTransferDecisionRequest;
import com.bimlab.asset.dto.request.AssetTransferHeaderRequest;
import com.bimlab.asset.dto.response.AssetTransferHeaderResponse;
import com.bimlab.asset.service.AssetTransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset")
@RequiredArgsConstructor
public class AssetTransferController {
    private final AssetTransferService service;

    @GetMapping("/transfer")
    @PreAuthorize("hasAnyAuthority('asset_transfers_view','asset_transfers_manage','asset_transfers_approve','asset_manage')")
    public List<AssetTransferHeaderResponse> listHeaders() {
        return service.listTransferHeaders();
    }

    @GetMapping("/transfer/{id}")
    @PreAuthorize("hasAnyAuthority('asset_transfers_view','asset_transfers_manage','asset_transfers_approve','asset_manage')")
    public AssetTransferHeaderResponse getHeader(@PathVariable Long id) {
        return service.getTransferHeader(id);
    }

    @PostMapping("/transfer")
    @PreAuthorize("hasAnyAuthority('asset_transfers_manage','asset_manage')")
    public AssetTransferHeaderResponse createDraft(@Valid @RequestBody AssetTransferHeaderRequest req) {
        return service.createTransferDraft(req);
    }

    @PostMapping("/transfer/{id}/submit")
    @PreAuthorize("hasAnyAuthority('asset_transfers_manage','asset_manage')")
    public AssetTransferHeaderResponse submit(@PathVariable Long id) {
        return service.submitTransferHeader(id);
    }

    @PostMapping("/transfer/{id}/approve")
    @PreAuthorize("hasAnyAuthority('asset_transfers_approve','asset_manage')")
    public AssetTransferHeaderResponse approve(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) AssetTransferDecisionRequest req
    ) {
        return service.approveTransferHeader(id, req);
    }

    @PostMapping("/transfer/{id}/reject")
    @PreAuthorize("hasAnyAuthority('asset_transfers_approve','asset_manage')")
    public AssetTransferHeaderResponse reject(
            @PathVariable Long id,
            @Valid @RequestBody AssetTransferDecisionRequest req
    ) {
        return service.rejectTransferHeader(id, req);
    }

    @PostMapping("/transfer/{id}/cancel")
    @PreAuthorize("hasAnyAuthority('asset_transfers_manage','asset_manage')")
    public AssetTransferHeaderResponse cancel(
            @PathVariable Long id,
            @Valid @RequestBody AssetTransferDecisionRequest req
    ) {
        return service.cancelTransferHeader(id, req);
    }
}
