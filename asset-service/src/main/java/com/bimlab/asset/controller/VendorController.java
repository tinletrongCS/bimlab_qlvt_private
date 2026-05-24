package com.bimlab.asset.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import com.bimlab.asset.dto.VendorRequest;
import com.bimlab.asset.model.Vendor;
import com.bimlab.asset.service.VendorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset/vendors")
@RequiredArgsConstructor
public class VendorController {
    private final VendorService service;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<Vendor> list() {
        return service.listVendors();
    }

    // N4: paginated list — backward-compatible with legacy GET (no /paged) which still returns List<Vendor>.
    @GetMapping("/paged")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public Page<Vendor> listPaged(@PageableDefault(size = 20) Pageable pageable) {
        return service.listVendorsPaged(pageable);
    }


    // F1: Vendor is master data — admin perms only (Q1 flattened gate).
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('vendor_manage','asset_manage','asset_view_all')")
    public Vendor get(@PathVariable Long id) {
        return service.getVendor(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('vendor_manage','asset_manage')")
    public Vendor create(@Valid @RequestBody VendorRequest req) {
        return service.createVendor(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('vendor_manage','asset_manage')")
    public Vendor update(@PathVariable Long id, @Valid @RequestBody VendorRequest req) {
        return service.updateVendor(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('vendor_manage','asset_manage')")
    public void delete(@PathVariable Long id) {
        service.deleteVendor(id);
    }
}
