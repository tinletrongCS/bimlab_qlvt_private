package com.bimlab.asset.controller;

import com.bimlab.asset.dto.ContractRequest;
import com.bimlab.asset.model.Contract;
import com.bimlab.asset.service.ContractService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/asset/contracts")
@RequiredArgsConstructor
public class ContractController {
    private final ContractService service;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<Contract> list() {
        return service.listContracts();
    }

    // F1: Contract has no employee owner — admin perms only (Q1 flattened gate).
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('contract_manage','asset_finance_manage','asset_manage','asset_view_all')")
    public Contract get(@PathVariable Long id) {
        return service.getContract(id);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('contract_manage','asset_finance_manage','asset_manage')")
    public Contract create(@Valid @RequestBody ContractRequest req) {
        return service.createContract(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('contract_manage','asset_finance_manage','asset_manage')")
    public Contract update(@PathVariable Long id, @Valid @RequestBody ContractRequest req) {
        return service.updateContract(id, req);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('contract_manage','asset_finance_manage','asset_manage')")
    public Contract status(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return service.updateContractStatus(id, body.get("status"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('contract_manage','asset_finance_manage','asset_manage')")
    public void delete(@PathVariable Long id) {
        service.deleteContract(id);
    }
}
