package com.bimlab.asset.controller;

import com.bimlab.asset.dto.SubscriptionRequest;
import com.bimlab.asset.model.Subscription;
import com.bimlab.asset.service.AssetManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {
    private final AssetManagementService service;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<Subscription> list() {
        return service.listSubscriptions();
    }

    // F1: Subscription is master data — admin perms only. Q1 flattens wave-1's
    // broad-read + imperative-admin layering into one declarative gate
    // matching SUBSCRIPTION_ADMIN exactly.
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('subscription_manage','asset_manage','asset_view_all')")
    public Subscription get(@PathVariable Long id) {
        return service.getSubscription(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('subscription_manage','asset_manage')")
    public Subscription create(@Valid @RequestBody SubscriptionRequest req) {
        return service.createSubscription(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('subscription_manage','asset_manage')")
    public Subscription update(@PathVariable Long id, @Valid @RequestBody SubscriptionRequest req) {
        return service.updateSubscription(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('subscription_manage','asset_manage')")
    public void delete(@PathVariable Long id) {
        service.deleteSubscription(id);
    }
}
