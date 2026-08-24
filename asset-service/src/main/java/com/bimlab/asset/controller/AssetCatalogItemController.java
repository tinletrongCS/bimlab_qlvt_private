package com.bimlab.asset.controller;

import com.bimlab.asset.dto.request.AssetCatalogItemRequest;
import com.bimlab.asset.dto.request.AssetCatalogUnassignmentRequest;
import com.bimlab.asset.dto.response.AssetCatalogItemDetailResponse;
import com.bimlab.asset.dto.response.AssetCatalogItemListResponse;
import com.bimlab.asset.dto.response.AssetResponse;
import com.bimlab.asset.mapper.AssetMapper;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.security.Permission;
import com.bimlab.asset.service.AssetCatalogItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/asset/catalog-items")
@RequiredArgsConstructor
public class AssetCatalogItemController {
    private final AssetCatalogItemService service;
    private final AssetAccessService access;
    private final AssetMapper mapper;

    private boolean canViewFinance() {
        return access.hasAnyPermission(Permission.Sets.FINANCE_VIEWERS.toArray(Permission[]::new));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage','asset_finance_view')")
    public Page<AssetCatalogItemListResponse> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 20, sort = "name") Pageable pageable
    ) {
        return service.listCatalogItems(keyword, categoryId, active, pageable);
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage','asset_finance_view')")
    public List<AssetCatalogItemListResponse> listActive(
            @RequestParam(required = false) Long categoryId
    ) {
        return service.listActiveCatalogItemsByCategory(categoryId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage','asset_finance_view')")
    public AssetCatalogItemDetailResponse get(@PathVariable Long id) {
        return service.getCatalogItem(id);
    }

    @GetMapping("/{id}/assets")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage','asset_finance_view')")
    public List<AssetResponse> listAssignedAssets(@PathVariable Long id) {
        boolean finance = canViewFinance();
        return service.listAssignedAssets(id).stream()
                .map(asset -> mapper.toResponse(asset, finance))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetCatalogItemDetailResponse create(@Valid @RequestBody AssetCatalogItemRequest request) {
        return service.createCatalogItem(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetCatalogItemDetailResponse update(
            @PathVariable Long id,
            @Valid @RequestBody AssetCatalogItemRequest request
    ) {
        return service.updateCatalogItem(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('asset_manage')")
    public void deactivate(@PathVariable Long id) {
        service.deactivateCatalogItem(id);
    }

    @DeleteMapping("/{id}/assets/{assetId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('asset_manage')")
    public void unassignAsset(@PathVariable Long id, @PathVariable Long assetId) {
        service.unassignAsset(id, assetId);
    }

    @PostMapping("/{id}/assets/unassign")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('asset_manage')")
    public void unassignAssets(
            @PathVariable Long id,
            @Valid @RequestBody AssetCatalogUnassignmentRequest request
    ) {
        service.unassignAssets(id, request);
    }

    @DeleteMapping("/{id}/permanent")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('asset_manage')")
    public void deletePermanently(@PathVariable Long id) {
        service.deleteCatalogItem(id);
    }
}
