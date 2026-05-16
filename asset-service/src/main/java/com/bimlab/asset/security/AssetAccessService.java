package com.bimlab.asset.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class AssetAccessService {
    public void ensureAccess() {
        ensureAny("asset_access", "asset_view_self", "asset_view_team", "asset_view_all", "asset_manage", "asset_finance_manage");
    }

    public void ensureAssetManage() {
        ensureAny("asset_manage");
    }

    public void ensureVendorManage() {
        ensureAny("vendor_manage", "asset_manage");
    }

    public void ensureSubscriptionManage() {
        ensureAny("subscription_manage", "asset_manage");
    }

    public void ensurePurchaseCreate() {
        ensureAny("purchase_request_create", "asset_manage");
    }

    public void ensurePurchaseApprove() {
        ensureAny("purchase_request_approve", "asset_finance_manage", "asset_manage");
    }

    public void ensureReportView() {
        ensureAny("asset_report_view", "asset_view_all", "asset_manage", "asset_finance_manage");
    }

    private void ensureAny(String... permissions) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Chưa đăng nhập");
        }
        boolean ok = Arrays.stream(permissions).anyMatch(permission ->
                authentication.getAuthorities().stream().anyMatch(authority -> permission.equals(authority.getAuthority()))
        );
        if (!ok) {
            throw new AccessDeniedException("Tài khoản chưa được cấp quyền QLVT");
        }
    }
}
