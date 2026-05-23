package com.bimlab.asset.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Objects;
import java.util.Set;

/**
 * Imperative authorization helper for QLVT endpoints.
 *
 * <p>Q1: non-object-context gates (POST/PUT/DELETE/PATCH and the list/report
 * endpoints) are now expressed declaratively via {@code @PreAuthorize} on
 * controller methods. The {@code ensureSelfOrAny} / {@code ensurePartyOrAny}
 * helpers stay imperative because they need the domain object loaded from
 * the DB before the ownership check can run.
 *
 * <p>{@link #ensureAccess()} remains imperative too — it gates the broad
 * read scope and runs <em>before</em> {@code ensureSelfOrAny}.
 */
@Component
public class AssetAccessService {

    public void ensureAccess() {
        ensureAny(Permission.ASSET_ACCESS, Permission.ASSET_VIEW_SELF,
                Permission.ASSET_VIEW_TEAM, Permission.ASSET_VIEW_ALL,
                Permission.ASSET_MANAGE, Permission.ASSET_FINANCE_MANAGE);
    }

    public void ensureAssetManage() {
        ensureAny(Permission.ASSET_MANAGE);
    }

    public void ensureVendorManage() {
        ensureAny(Permission.VENDOR_MANAGE, Permission.ASSET_MANAGE);
    }

    public void ensureSubscriptionManage() {
        ensureAny(Permission.SUBSCRIPTION_MANAGE, Permission.ASSET_MANAGE);
    }

    public void ensurePurchaseCreate() {
        ensureAny(Permission.PURCHASE_REQUEST_CREATE, Permission.ASSET_MANAGE);
    }

    public void ensurePurchaseApprove() {
        ensureAny(Permission.PURCHASE_REQUEST_APPROVE,
                Permission.ASSET_FINANCE_MANAGE, Permission.ASSET_MANAGE);
    }

    public void ensureContractManage() {
        ensureAny(Permission.CONTRACT_MANAGE,
                Permission.ASSET_FINANCE_MANAGE, Permission.ASSET_MANAGE);
    }

    public void ensureMaintenanceManage() {
        ensureAny(Permission.MAINTENANCE_MANAGE, Permission.ASSET_MANAGE);
    }

    public void ensureReportView() {
        ensureAny(Permission.ASSET_REPORT_VIEW, Permission.ASSET_VIEW_ALL,
                Permission.ASSET_MANAGE, Permission.ASSET_FINANCE_MANAGE);
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

    public boolean hasAnyPermission(Permission... permissions) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return false;
        return matchesAny(authentication, permissions);
    }

    /**
     * F1: pass if caller has any of {@code adminPermissions}, OR if
     * {@code ownerEmployeeId} matches the caller's employeeId from the JWT.
     * If {@code ownerEmployeeId} is null (resource has no owner — e.g.
     * Contract/Vendor/Subscription master data), only admin permissions allow
     * access.
     */
    public void ensureSelfOrAny(Long ownerEmployeeId, Set<Permission> adminPermissions) {
        if (hasAnyPermission(adminPermissions.toArray(Permission[]::new))) return;
        Long current = getCurrentEmployeeId();
        if (ownerEmployeeId != null && Objects.equals(ownerEmployeeId, current)) return;
        throw new AccessDeniedException("Không có quyền truy cập tài nguyên này");
    }

    /**
     * F1 variant for AssetTransfer where the caller may be either the
     * from-party or the to-party of the transfer. Pass if admin perm, or if
     * caller's employeeId matches either side.
     */
    public void ensurePartyOrAny(Long fromEmployeeId, Long toEmployeeId, Set<Permission> adminPermissions) {
        if (hasAnyPermission(adminPermissions.toArray(Permission[]::new))) return;
        Long current = getCurrentEmployeeId();
        if (current != null && (Objects.equals(current, fromEmployeeId) || Objects.equals(current, toEmployeeId))) return;
        throw new AccessDeniedException("Không có quyền truy cập tài nguyên này");
    }

    private void ensureAny(Permission... permissions) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Chưa đăng nhập");
        }
        if (!matchesAny(authentication, permissions)) {
            throw new AccessDeniedException("Tài khoản chưa được cấp quyền QLVT");
        }
    }

    private static boolean matchesAny(Authentication authentication, Permission... permissions) {
        return Arrays.stream(permissions).anyMatch(permission ->
                authentication.getAuthorities().stream()
                        .anyMatch(authority -> permission.code().equals(authority.getAuthority()))
        );
    }
}
