package com.bimlab.asset.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import com.bimlab.asset.dto.request.PurchaseRequestRequest;
import com.bimlab.asset.dto.request.StatusUpdateRequest;
import com.bimlab.asset.dto.response.PurchaseRequestResponse;
import com.bimlab.asset.mapper.PurchaseRequestMapper;
import com.bimlab.asset.model.PurchaseRequest;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.security.Permission;
import com.bimlab.asset.service.PurchaseRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset/purchase-requests")
@RequiredArgsConstructor
public class PurchaseRequestController {
    private final PurchaseRequestService service;
    private final AssetAccessService access;
    private final PurchaseRequestMapper mapper;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<PurchaseRequestResponse> list() {
        return service.listPurchaseRequests().stream().map(mapper::toResponse).toList();
    }

    // Legacy GET without /paged remains compatible and returns List<PurchaseRequest>.
    @GetMapping("/paged")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public Page<PurchaseRequestResponse> listPaged(@PageableDefault(size = 20) Pageable pageable) {
        return service.listPurchaseRequestsPaged(pageable).map(mapper::toResponse);
    }


    // Requester can see own PR; otherwise admin permission required.
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public PurchaseRequestResponse get(@PathVariable Long id) {
        PurchaseRequest pr = service.getPurchaseRequest(id);
        access.ensureSelfOrAny(pr.getRequesterEmployeeId(), Permission.Sets.PR_ADMIN);
        return mapper.toResponse(pr);
    }

    // Server stamps requesterEmployeeId from the JWT principal; status forced PENDING.
    // Always call the 2-arg form; the 1-arg overload is deprecated to avoid
    // accidental null-requester writes that would corrupt the audit trail.
    @PostMapping
    @PreAuthorize("hasAnyAuthority('purchase_request_create','asset_manage')")
    public PurchaseRequestResponse create(@Valid @RequestBody PurchaseRequestRequest req) {
        Long callerEmployeeId = access.getCurrentEmployeeId();
        return mapper.toResponse(service.createPurchaseRequest(req, callerEmployeeId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('purchase_request_approve','asset_finance_manage','asset_manage')")
    public PurchaseRequestResponse update(@PathVariable Long id, @Valid @RequestBody PurchaseRequestRequest req) {
        return mapper.toResponse(service.updatePurchaseRequest(id, req));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('purchase_request_approve','asset_finance_manage','asset_manage')")
    public PurchaseRequestResponse status(
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest req
    ) {
        return mapper.toResponse(service.updatePurchaseStatus(id, req.status()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('purchase_request_approve','asset_finance_manage','asset_manage')")
    public void delete(@PathVariable Long id) {
        service.deletePurchaseRequest(id);
    }
}
