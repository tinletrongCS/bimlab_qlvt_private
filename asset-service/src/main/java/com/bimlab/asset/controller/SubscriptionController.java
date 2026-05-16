package com.bimlab.asset.controller;

import com.bimlab.asset.dto.SubscriptionRequest;
import com.bimlab.asset.model.Subscription;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.AssetManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {
    private final AssetManagementService service;
    private final AssetAccessService access;

    @GetMapping public List<Subscription> list() { access.ensureAccess(); return service.listSubscriptions(); }
    @GetMapping("/{id}") public Subscription get(@PathVariable Long id) { access.ensureAccess(); return service.getSubscription(id); }
    @PostMapping public Subscription create(@Valid @RequestBody SubscriptionRequest req) { access.ensureSubscriptionManage(); return service.createSubscription(req); }
    @PutMapping("/{id}") public Subscription update(@PathVariable Long id, @Valid @RequestBody SubscriptionRequest req) { access.ensureSubscriptionManage(); return service.updateSubscription(id, req); }
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id) { access.ensureSubscriptionManage(); service.deleteSubscription(id); }
}
