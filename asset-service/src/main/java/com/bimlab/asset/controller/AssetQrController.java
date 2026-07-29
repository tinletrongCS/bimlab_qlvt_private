package com.bimlab.asset.controller;

import com.bimlab.asset.dto.request.AssetQrIssueRequest;
import com.bimlab.asset.dto.response.AssetQrIssueResponse;
import com.bimlab.asset.dto.response.AssetQrPublicResponse;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.security.AssetQrAccessPolicy;
import com.bimlab.asset.security.Permission;
import com.bimlab.asset.service.AssetQrService;
import com.bimlab.asset.service.AssetService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/asset/qr")
@RequiredArgsConstructor
public class AssetQrController {
    private static final int MAX_BATCH_SIZE = 100;

    private final AssetQrService qrService;
    private final AssetService assetService;
    private final AssetAccessService access;
    private final AssetQrAccessPolicy accessPolicy;

    @PostMapping("/issue")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage')")
    public List<AssetQrIssueResponse> issue(@Valid @RequestBody AssetQrIssueRequest request) {
        List<Long> assetIds = request.assetIds().stream().distinct().toList();
        if (assetIds.size() > MAX_BATCH_SIZE) {
            throw new IllegalArgumentException("Mỗi lần chỉ được in tối đa 100 mã QR");
        }
        return assetIds.stream().map(assetId -> {
            AssetItem asset = assetService.getAssetById(assetId);
            access.ensureSelfOrAny(asset.getAssignedEmployeeId(), Permission.Sets.ASSET_ADMIN);
            return qrService.issue(assetId);
        }).toList();
    }

    @GetMapping("/public/{token}")
    public AssetQrPublicResponse publicAsset(@PathVariable String token, HttpServletRequest request) {
        if (!accessPolicy.canView(request)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Cần đăng nhập ngoài mạng nội bộ");
        }
        return qrService.getPublicAsset(token);
    }
}
