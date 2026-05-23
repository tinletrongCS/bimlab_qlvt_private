package com.bimlab.asset.controller;

import com.bimlab.asset.dto.ContractRequest;
import com.bimlab.asset.model.Contract;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.AssetManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/asset/contracts")
@RequiredArgsConstructor
public class ContractController {
    private final AssetManagementService service;
    private final AssetAccessService access;

    @GetMapping public List<Contract> list() { access.ensureAccess(); return service.listContracts(); }

    // F1: Contract has no employee owner — admin perms only.
    @GetMapping("/{id}") public Contract get(@PathVariable Long id) {
        access.ensureAccess();
        Contract c = service.getContract(id);
        access.ensureSelfOrAny(null,
                "contract_manage", "asset_finance_manage", "asset_manage", "asset_view_all");
        return c;
    }
    @PostMapping public Contract create(@Valid @RequestBody ContractRequest req) { access.ensureContractManage(); return service.createContract(req); }
    @PutMapping("/{id}") public Contract update(@PathVariable Long id, @Valid @RequestBody ContractRequest req) { access.ensureContractManage(); return service.updateContract(id, req); }
    @PatchMapping("/{id}/status") public Contract status(@PathVariable Long id, @RequestBody Map<String, String> body) { access.ensureContractManage(); return service.updateContractStatus(id, body.get("status")); }
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id) { access.ensureContractManage(); service.deleteContract(id); }
}
