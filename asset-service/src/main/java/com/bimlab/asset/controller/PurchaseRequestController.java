package com.bimlab.asset.controller;

import com.bimlab.asset.dto.PurchaseRequestPayload;
import com.bimlab.asset.model.PurchaseRequest;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.AssetManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/asset/purchase-requests")
@RequiredArgsConstructor
public class PurchaseRequestController {
    private final AssetManagementService service;
    private final AssetAccessService access;

    @GetMapping public List<PurchaseRequest> list() { access.ensureAccess(); return service.listPurchaseRequests(); }

    // F1: requester can see own PR; otherwise admin perm required.
    @GetMapping("/{id}") public PurchaseRequest get(@PathVariable Long id) {
        access.ensureAccess();
        PurchaseRequest pr = service.getPurchaseRequest(id);
        access.ensureSelfOrAny(pr.getRequesterEmployeeId(), PR_ADMIN_PERMS);
        return pr;
    }

    // F4: server stamps requesterEmployeeId from the JWT principal; status forced PENDING.
    @PostMapping public PurchaseRequest create(@Valid @RequestBody PurchaseRequestPayload req) {
        access.ensurePurchaseCreate();
        Long callerEmployeeId = access.getCurrentEmployeeId();
        return service.createPurchaseRequest(req, callerEmployeeId);
    }

    @PutMapping("/{id}") public PurchaseRequest update(@PathVariable Long id, @Valid @RequestBody PurchaseRequestPayload req) { access.ensurePurchaseApprove(); return service.updatePurchaseRequest(id, req); }
    @PatchMapping("/{id}/status") public PurchaseRequest status(@PathVariable Long id, @RequestBody Map<String, String> body) { access.ensurePurchaseApprove(); return service.updatePurchaseStatus(id, body.get("status")); }
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id) { access.ensurePurchaseApprove(); service.deletePurchaseRequest(id); }

    private static final String[] PR_ADMIN_PERMS = {
            "purchase_request_approve", "asset_finance_manage", "asset_manage", "asset_view_all"
    };
}
