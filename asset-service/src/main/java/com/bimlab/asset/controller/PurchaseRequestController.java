package com.bimlab.asset.controller;

import com.bimlab.asset.dto.PurchaseRequestPayload;
import com.bimlab.asset.model.PurchaseRequest;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.security.Permission;
import com.bimlab.asset.service.AssetManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/asset/purchase-requests")
@RequiredArgsConstructor
public class PurchaseRequestController {
    private final AssetManagementService service;
    private final AssetAccessService access;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<PurchaseRequest> list() {
        return service.listPurchaseRequests();
    }

    // F1: requester can see own PR; otherwise admin perm required.
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public PurchaseRequest get(@PathVariable Long id) {
        PurchaseRequest pr = service.getPurchaseRequest(id);
        access.ensureSelfOrAny(pr.getRequesterEmployeeId(), Permission.Sets.PR_ADMIN);
        return pr;
    }

    // F4: server stamps requesterEmployeeId from the JWT principal; status forced PENDING.
    @PostMapping
    @PreAuthorize("hasAnyAuthority('purchase_request_create','asset_manage')")
    public PurchaseRequest create(@Valid @RequestBody PurchaseRequestPayload req) {
        Long callerEmployeeId = access.getCurrentEmployeeId();
        return service.createPurchaseRequest(req, callerEmployeeId);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('purchase_request_approve','asset_finance_manage','asset_manage')")
    public PurchaseRequest update(@PathVariable Long id, @Valid @RequestBody PurchaseRequestPayload req) {
        return service.updatePurchaseRequest(id, req);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('purchase_request_approve','asset_finance_manage','asset_manage')")
    public PurchaseRequest status(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return service.updatePurchaseStatus(id, body.get("status"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('purchase_request_approve','asset_finance_manage','asset_manage')")
    public void delete(@PathVariable Long id) {
        service.deletePurchaseRequest(id);
    }
}
