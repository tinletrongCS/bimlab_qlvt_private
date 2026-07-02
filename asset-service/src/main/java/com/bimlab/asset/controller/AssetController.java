package com.bimlab.asset.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import com.bimlab.asset.dto.request.AssetRequest;
import com.bimlab.asset.dto.request.AssetImportCommitRequest;
import com.bimlab.asset.dto.request.AssetImportValidateRequest;
import com.bimlab.asset.dto.request.DisposeAssetRequest;
import com.bimlab.asset.dto.response.AssetImportCommitResponse;
import com.bimlab.asset.dto.response.AssetImportValidationResponse;
import com.bimlab.asset.dto.response.AssetResponse;
import com.bimlab.asset.dto.response.DepreciationSnapshot;
import com.bimlab.asset.mapper.AssetMapper;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.security.Permission;
import com.bimlab.asset.service.AssetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset/assets")
@RequiredArgsConstructor
public class AssetController {
    private final AssetService service;
    private final AssetAccessService access;
    private final AssetMapper mapper;

    /** Caller có được thấy trường tài chính không (asset_finance_view/finance_manage/manage). */
    private boolean canViewFinance() {
        return access.hasAnyPermission(Permission.Sets.FINANCE_VIEWERS.toArray(Permission[]::new));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage','asset_finance_view')")
    public List<AssetResponse> list() {
        boolean finance = canViewFinance();
        return service.listAssets().stream().map(a -> mapper.toResponse(a, finance)).toList();
    }

    @GetMapping("/paged")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage','asset_finance_manage','asset_finance_view')")
    public Page<AssetResponse> listPaged(@PageableDefault(size = 20) Pageable pageable) {
        boolean finance = canViewFinance();
        return service.listAssetsPaged(pageable).map(a -> mapper.toResponse(a, finance));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('asset_access', 'asset_view_self', 'asset_view_team', 'asset_view_all', 'asset_manage', 'asset_finance_manage', 'asset_finance_view')")
    public AssetResponse get(@PathVariable Long id) {
        AssetItem item = service.getAssetById(id);
        access.ensureSelfOrAny(item.getAssignedEmployeeId(), Permission.Sets.ASSET_ADMIN);
        return mapper.toResponse(item, canViewFinance());
    }
    @PostMapping
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetResponse create(@Valid @RequestBody AssetRequest req) {
        return mapper.toResponse(service.createAsset(req));
    }

    /*
    TODO Kiểm tra dữ liệu được nhập vào từ excel trong trang quản lý danh sách tài sản
     */
    @PostMapping("/import/validate")
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetImportValidationResponse validateImport(@Valid @RequestBody AssetImportValidateRequest req) {
        return service.validateAssetImport(req);
    }

    @PostMapping("/import")
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetImportCommitResponse importAssets(@Valid @RequestBody AssetImportCommitRequest req) {
        return service.importAssets(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetResponse update(@PathVariable Long id, @Valid @RequestBody AssetRequest req) {
        return mapper.toResponse(service.updateAsset(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('asset_manage')")
    public void delete(@PathVariable Long id) {
        service.deleteAsset(id);
    }

    /*
    TODO tính khấu hao theo từng danh mục tài sản -> để làm sau khi có công thức tính
     */
    // Snapshot khấu hao là dữ liệu thuần tài chính → chỉ nhóm xem được tài chính
    // (asset_finance_view/finance_manage; asset_manage nhập liệu tài chính nên giữ).
    @GetMapping("/{id}/depreciation")
    @PreAuthorize("hasAnyAuthority('asset_finance_view','asset_finance_manage','asset_manage')")
    public DepreciationSnapshot depreciation(@PathVariable Long id) {
        AssetItem item = service.getAssetById(id);
        access.ensureSelfOrAny(item.getAssignedEmployeeId(), Permission.Sets.ASSET_ADMIN);
        return service.calculateDepreciation(item);
    }

    @PostMapping("/{id}/dispose")
    @PreAuthorize("hasAuthority('asset_manage')")
    public AssetResponse dispose(@PathVariable Long id, @Valid @RequestBody DisposeAssetRequest req) {
        return mapper.toResponse(service.disposeAsset(id, req));
    }
}
