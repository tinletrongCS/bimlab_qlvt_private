package com.bimlab.asset.controller;

import com.bimlab.asset.dto.VendorRequest;
import com.bimlab.asset.model.Vendor;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.AssetManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset/vendors")
@RequiredArgsConstructor
public class VendorController {
    private final AssetManagementService service;
    private final AssetAccessService access;

    @GetMapping public List<Vendor> list() { access.ensureAccess(); return service.listVendors(); }

    // F1: Vendor is master data — admin perms only.
    @GetMapping("/{id}") public Vendor get(@PathVariable Long id) {
        access.ensureAccess();
        Vendor v = service.getVendor(id);
        access.ensureSelfOrAny(null,
                "vendor_manage", "asset_manage", "asset_view_all");
        return v;
    }
    @PostMapping public Vendor create(@Valid @RequestBody VendorRequest req) { access.ensureVendorManage(); return service.createVendor(req); }
    @PutMapping("/{id}") public Vendor update(@PathVariable Long id, @Valid @RequestBody VendorRequest req) { access.ensureVendorManage(); return service.updateVendor(id, req); }
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id) { access.ensureVendorManage(); service.deleteVendor(id); }
}
