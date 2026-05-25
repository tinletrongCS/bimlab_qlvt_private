package com.bimlab.asset.controller;

import com.bimlab.asset.dto.ContractRequest;
import com.bimlab.asset.model.Contract;
import com.bimlab.asset.service.ContractService;
import com.bimlab.asset.storage.MinioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/asset/contracts")
@RequiredArgsConstructor
public class ContractController {
    private final ContractService service;
    private final MinioService minioService;

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

    // Q7: upload a contract attachment to MinIO. Returns {fileKey, downloadUrl}.
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('contract_manage','asset_finance_manage','asset_manage')")
    public Map<String, String> upload(@RequestParam("file") MultipartFile file) {
        String key = minioService.upload(file, "contracts");
        Map<String, String> body = new HashMap<>();
        body.put("fileKey", key);
        String url = minioService.getPresignedUrl(key);
        if (url != null) body.put("downloadUrl", url);
        return body;
    }

    // Q7: stream a contract attachment by object key (server-side fetch, no public URL leak).
    @GetMapping("/files/view")
    @PreAuthorize("hasAnyAuthority('contract_manage','asset_finance_manage','asset_manage','asset_view_all')")
    public ResponseEntity<InputStreamResource> view(@RequestParam("key") String key) {
        InputStream stream = minioService.getObjectStream(key);
        if (stream == null) {
            return ResponseEntity.notFound().build();
        }
        String contentType = minioService.getContentType(key);
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(new InputStreamResource(stream));
    }
}
