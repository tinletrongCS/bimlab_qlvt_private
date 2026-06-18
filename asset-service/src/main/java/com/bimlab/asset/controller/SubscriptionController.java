package com.bimlab.asset.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import com.bimlab.asset.dto.request.SubscriptionRequest;
import com.bimlab.asset.dto.response.SubscriptionResponse;
import com.bimlab.asset.mapper.SubscriptionMapper;
import com.bimlab.asset.service.SubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {
    private final SubscriptionService service;
    private final SubscriptionMapper mapper;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<SubscriptionResponse> list() {
        return service.listSubscriptions().stream().map(mapper::toResponse).toList();
    }

    // N4: paginated list — backward-compatible with legacy GET (no /paged) which still returns List<Subscription>.
    @GetMapping("/paged")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public Page<SubscriptionResponse> listPaged(@PageableDefault(size = 20) Pageable pageable) {
        return service.listSubscriptionsPaged(pageable).map(mapper::toResponse);
    }


    // F1: Subscription is master data — admin perms only (Q1 flattened gate).
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('subscription_manage','asset_manage','asset_view_all')")
    public SubscriptionResponse get(@PathVariable Long id) {
        return mapper.toResponse(service.getSubscription(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('subscription_manage','asset_manage')")
    public SubscriptionResponse create(@Valid @RequestBody SubscriptionRequest req) {
        return mapper.toResponse(service.createSubscription(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('subscription_manage','asset_manage')")
    public SubscriptionResponse update(@PathVariable Long id, @Valid @RequestBody SubscriptionRequest req) {
        return mapper.toResponse(service.updateSubscription(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('subscription_manage','asset_manage')")
    public void delete(@PathVariable Long id) {
        service.deleteSubscription(id);
    }
}
