package com.bimlab.asset.controller;

import com.bimlab.asset.dto.request.AssetQrIssueRequest;
import com.bimlab.asset.dto.response.AssetQrHistoryResponse;
import com.bimlab.asset.dto.response.AssetQrIssueResponse;
import com.bimlab.asset.dto.response.AssetQrPublicResponse;
import com.bimlab.asset.entity.AssetItem;
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
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
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
    public List<AssetQrIssueResponse> issue(
            @Valid @RequestBody AssetQrIssueRequest request,
            HttpServletRequest httpRequest
    ) {
        List<Long> assetIds = request.assetIds().stream().distinct().toList();
        if (assetIds.size() > MAX_BATCH_SIZE) {
            throw new IllegalArgumentException("Mỗi lần chỉ được in tối đa 100 mã QR");
        }
        return assetIds.stream().map(assetId -> {
            AssetItem asset = assetService.getAssetById(assetId);
            access.ensureSelfOrAny(asset.getAssignedEmployeeId(), Permission.Sets.ASSET_ADMIN);
            AssetQrIssueResponse issued = qrService.issue(assetId);
            return new AssetQrIssueResponse(
                    issued.assetId(),
                    issued.assetCode(),
                    issued.assetName(),
                    issued.token(),
                    publicUrl(httpRequest, issued.token())
            );
        }).toList();
    }

    private static String publicUrl(HttpServletRequest request, String token) {
        String forwardedProto = firstHeaderValue(request.getHeader("X-Forwarded-Proto"));
        String scheme = forwardedProto.isBlank() ? request.getScheme() : forwardedProto;
        if (!"https".equalsIgnoreCase(scheme)) {
            scheme = "http";
        }
        String forwardedHost = firstHeaderValue(request.getHeader("X-Forwarded-Host"));
        String host = forwardedHost.isBlank() ? request.getHeader("Host") : forwardedHost;
        if (host == null || host.isBlank()) {
            host = request.getServerName();
            int port = request.getServerPort();
            if (port > 0 && port != 80 && port != 443) {
                host += ":" + port;
            }
        }
        return scheme + "://" + host + "/asset-qr.html?token="
                + URLEncoder.encode(token, StandardCharsets.UTF_8);
    }

    private static String firstHeaderValue(String value) {
        return value == null ? "" : value.split(",", 2)[0].trim();
    }

    @GetMapping("/public/{token}")
    public AssetQrPublicResponse publicAsset(@PathVariable String token, HttpServletRequest request) {
        if (!accessPolicy.canView(request)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Cần đăng nhập ngoài mạng nội bộ");
        }
        return qrService.getPublicAsset(token);
    }

    // Tại tab Lịch sử bàn giao - chỉ hiện thông tin cho mỗi lần ban giao được xét duyệt
    // khi đó trạng thái (chi nhánh/phòng ban/nhân sự đang giữ) mới có thay đổi
    // -> hiện nhiều quá bị dư thừa
    @GetMapping("/public/{token}/transfer-history")
    public List<AssetQrHistoryResponse> publicTransferHistory(
            @PathVariable String token,
            HttpServletRequest request
    ) {
        if (!accessPolicy.canView(request)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Cần đăng nhập ngoài mạng nội bộ");
        }
        return qrService.getTransferHistory(token);
    }
}
