package com.bimlab.asset.controller;

import com.bimlab.asset.dto.request.AssetTransferDecisionRequest;
import com.bimlab.asset.dto.request.AssetTransferHeaderRequest;
import com.bimlab.asset.dto.response.AssetTransferHeaderResponse;
import com.bimlab.asset.service.AssetTransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset/transfer")
@RequiredArgsConstructor
public class AssetTransferController {
    private final AssetTransferService service;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_transfers_view','asset_transfers_manage','asset_transfers_approve','asset_manage')")
    public List<AssetTransferHeaderResponse> listHeaders() {
        return service.listTransferHeaders();
    }

    @GetMapping("/paged")
    @PreAuthorize("hasAnyAuthority('asset_transfers_view','asset_transfers_manage','asset_transfers_approve','asset_manage')")
    public Page<AssetTransferHeaderResponse> listPaged(@PageableDefault(size = 20) Pageable pageable) {
        return service.listTransferHeadersPaged(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('asset_transfers_view','asset_transfers_manage','asset_transfers_approve','asset_manage')")
    public AssetTransferHeaderResponse getHeader(@PathVariable Long id) {
        return service.getTransferHeader(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('asset_transfers_manage','asset_manage')")
    public AssetTransferHeaderResponse createPendingApproval(@Valid @RequestBody AssetTransferHeaderRequest req) {
        return service.createTransferPendingApproval(req);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyAuthority('asset_transfers_approve','asset_manage')")
    public AssetTransferHeaderResponse approve(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) AssetTransferDecisionRequest req
    ) {
        return service.approveTransferHeader(id, req);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyAuthority('asset_transfers_approve','asset_manage')")
    public AssetTransferHeaderResponse reject(
            @PathVariable Long id,
            @Valid @RequestBody AssetTransferDecisionRequest req
    ) {
        return service.rejectTransferHeader(id, req);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyAuthority('asset_transfers_manage','asset_manage')")
    public AssetTransferHeaderResponse cancel(
            @PathVariable Long id,
            @Valid @RequestBody AssetTransferDecisionRequest req
    ) {
        return service.cancelTransferHeader(id, req);
    }
}
