package com.bimlab.asset.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import com.bimlab.asset.dto.request.ContractRequest;
import com.bimlab.asset.dto.request.StatusUpdateRequest;
import com.bimlab.asset.dto.response.ContractResponse;
import com.bimlab.asset.dto.response.FileUploadResponse;
import com.bimlab.asset.mapper.ContractMapper;
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
import java.util.List;

@RestController
@RequestMapping("/api/asset/contracts")
@RequiredArgsConstructor
public class ContractController {
    private final ContractService service;
    private final MinioService minioService;
    private final ContractMapper mapper;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public List<ContractResponse> list() {
        return service.listContracts().stream().map(mapper::toResponse).toList();
    }

    // N4: paginated list — backward-compatible with legacy GET (no /paged) which still returns List<Contract>.
    @GetMapping("/paged")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage')")
    public Page<ContractResponse> listPaged(@PageableDefault(size = 20) Pageable pageable) {
        return service.listContractsPaged(pageable).map(mapper::toResponse);
    }


    // F1: Contract has no employee owner — admin perms only (Q1 flattened gate).
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('contract_manage','asset_finance_manage','asset_manage','asset_view_all')")
    public ContractResponse get(@PathVariable Long id) {
        return mapper.toResponse(service.getContract(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('contract_manage','asset_finance_manage','asset_manage')")
    public ContractResponse create(@Valid @RequestBody ContractRequest req) {
        return mapper.toResponse(service.createContract(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('contract_manage','asset_finance_manage','asset_manage')")
    public ContractResponse update(@PathVariable Long id, @Valid @RequestBody ContractRequest req) {
        return mapper.toResponse(service.updateContract(id, req));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('contract_manage','asset_finance_manage','asset_manage')")
    public ContractResponse status(
            @PathVariable Long id,
            @Valid @RequestBody StatusUpdateRequest req
    ) {
        return mapper.toResponse(service.updateContractStatus(id, req.status()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('contract_manage','asset_finance_manage','asset_manage')")
    public void delete(@PathVariable Long id) {
        service.deleteContract(id);
    }

    // Q7: upload a contract attachment to MinIO. Returns {fileKey, downloadUrl}.
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('contract_manage','asset_finance_manage','asset_manage')")
    public FileUploadResponse upload(@RequestParam("file") MultipartFile file) {
        String key = minioService.upload(file, "contracts");
        return new FileUploadResponse(key, minioService.getPresignedUrl(key));
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
