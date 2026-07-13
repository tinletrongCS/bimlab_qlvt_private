package com.bimlab.asset.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import com.bimlab.asset.dto.request.VendorRequest;
import com.bimlab.asset.dto.response.VendorResponse;
import com.bimlab.asset.mapper.VendorMapper;
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
    private final VendorMapper mapper;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<VendorResponse> list() {
        return service.listVendors().stream().map(mapper::toResponse).toList();
    }

    // Legacy GET without /paged remains compatible and returns List<Vendor>.
    @GetMapping("/paged")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public Page<VendorResponse> listPaged(@PageableDefault(size = 20) Pageable pageable) {
        return service.listVendorsPaged(pageable).map(mapper::toResponse);
    }


    // Vendor is master data; admin permissions only.
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('vendor_manage','asset_manage','asset_view_all')")
    public VendorResponse get(@PathVariable Long id) {
        return mapper.toResponse(service.getVendor(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('vendor_manage','asset_manage')")
    public VendorResponse create(@Valid @RequestBody VendorRequest req) {
        return mapper.toResponse(service.createVendor(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('vendor_manage','asset_manage')")
    public VendorResponse update(@PathVariable Long id, @Valid @RequestBody VendorRequest req) {
        return mapper.toResponse(service.updateVendor(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('vendor_manage','asset_manage')")
    public void delete(@PathVariable Long id) {
        service.deleteVendor(id);
    }
}
