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
    @GetMapping("/{id}") public PurchaseRequest get(@PathVariable Long id) { access.ensureAccess(); return service.getPurchaseRequest(id); }
    @PostMapping public PurchaseRequest create(@Valid @RequestBody PurchaseRequestPayload req) { access.ensurePurchaseCreate(); return service.createPurchaseRequest(req); }
    @PutMapping("/{id}") public PurchaseRequest update(@PathVariable Long id, @Valid @RequestBody PurchaseRequestPayload req) { access.ensurePurchaseApprove(); return service.updatePurchaseRequest(id, req); }
    @PatchMapping("/{id}/status") public PurchaseRequest status(@PathVariable Long id, @RequestBody Map<String, String> body) { access.ensurePurchaseApprove(); return service.updatePurchaseStatus(id, body.get("status")); }
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id) { access.ensurePurchaseApprove(); service.deletePurchaseRequest(id); }
}
