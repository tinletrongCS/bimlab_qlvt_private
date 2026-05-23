package com.bimlab.asset.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Objects;

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

    public void ensureContractManage() {
        ensureAny("contract_manage", "asset_finance_manage", "asset_manage");
    }

    public void ensureMaintenanceManage() {
        ensureAny("maintenance_manage", "asset_manage");
    }

    public void ensureReportView() {
        ensureAny("asset_report_view", "asset_view_all", "asset_manage", "asset_finance_manage");
    }

    // ── F1 object-level scoping ────────────────────────────────────────────

    /**
     * F1: returns the caller's employeeId from the JWT-bound AssetPrincipal,
     * or null if the token has no employeeId claim (legacy session). Callers
     * must treat null as "cannot satisfy self-scope" — fall back to admin
     * permission check.
     */
    public Long getCurrentEmployeeId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) return null;
        Object principal = authentication.getPrincipal();
        if (principal instanceof AssetPrincipal p) return p.employeeId();
        return null;
    }

    public boolean hasAnyPermission(String... permissions) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return false;
        return Arrays.stream(permissions).anyMatch(permission ->
                authentication.getAuthorities().stream().anyMatch(authority -> permission.equals(authority.getAuthority()))
        );
    }

    /**
     * F1: pass if caller has any of {@code adminPermissions}, OR if
     * {@code ownerEmployeeId} matches the caller's employeeId from the JWT.
     * If {@code ownerEmployeeId} is null (resource has no owner — e.g.
     * Contract/Vendor/Subscription master data), only admin permissions allow
     * access.
     */
    public void ensureSelfOrAny(Long ownerEmployeeId, String... adminPermissions) {
        if (hasAnyPermission(adminPermissions)) return;
        Long current = getCurrentEmployeeId();
        if (ownerEmployeeId != null && Objects.equals(ownerEmployeeId, current)) return;
        throw new AccessDeniedException("Không có quyền truy cập tài nguyên này");
    }

    /**
     * F1 variant for AssetTransfer where the caller may be either the
     * from-party or the to-party of the transfer. Pass if admin perm, or if
     * caller's employeeId matches either side.
     */
    public void ensurePartyOrAny(Long fromEmployeeId, Long toEmployeeId, String... adminPermissions) {
        if (hasAnyPermission(adminPermissions)) return;
        Long current = getCurrentEmployeeId();
        if (current != null && (Objects.equals(current, fromEmployeeId) || Objects.equals(current, toEmployeeId))) return;
        throw new AccessDeniedException("Không có quyền truy cập tài nguyên này");
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
