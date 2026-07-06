package com.bimlab.asset.controller;

import com.bimlab.asset.dto.request.AssetCategoryRequest;
import com.bimlab.asset.dto.request.AssetCategoryImportCommitRequest;
import com.bimlab.asset.dto.request.AssetCategoryImportValidateRequest;
import com.bimlab.asset.dto.response.AssetCategoryImportCommitResponse;
import com.bimlab.asset.dto.response.AssetCategoryImportValidationResponse;
import com.bimlab.asset.dto.response.AssetCategoryResponse;
import com.bimlab.asset.dto.response.AssetCategoryTreeResponse;
import com.bimlab.asset.service.AssetCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/asset/categories")
@RequiredArgsConstructor
public class AssetCategoryController {
    private final AssetCategoryService service;

    @GetMapping
    @PreAuthorize("hasAuthority('asset_manage')")
    public List<AssetCategoryResponse> list() {
        return service.listCategories();
    }

    @GetMapping("/tree")
    @PreAuthorize("hasAuthority('asset_manage')")
    public List<AssetCategoryTreeResponse> tree() {
        return service.listCategoryTree();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetCategoryResponse get(@PathVariable Long id) {
        return service.getCategory(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetCategoryResponse create(@Valid @RequestBody AssetCategoryRequest req) {
        return service.createCategory(req);
    }

    @PostMapping("/import/validate")
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetCategoryImportValidationResponse validateImport(
            @Valid @RequestBody AssetCategoryImportValidateRequest req) {
        return service.validateCategoryImport(req);
    }

    @PostMapping("/import")
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetCategoryImportCommitResponse importCategories(
            @Valid @RequestBody AssetCategoryImportCommitRequest req) {
        return service.importCategories(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetCategoryResponse update(@PathVariable Long id, @Valid @RequestBody AssetCategoryRequest req) {
        return service.updateCategory(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('asset_manage')")
    public void delete(@PathVariable Long id) {
        service.deleteCategory(id);
    }
}
