package com.bimlab.asset.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Objects;
import java.util.Set;

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

    public void ensureSelfOrAny(Long ownerEmployeeId, Set<Permission> adminPermissions) {
        if (hasAnyPermission(adminPermissions.toArray(Permission[]::new))) return;
        Long current = getCurrentEmployeeId();
        if (ownerEmployeeId != null && Objects.equals(ownerEmployeeId, current)) return;
        throw new AccessDeniedException("Không có quyền truy cập tài nguyên này");
    }

    /*
      Dùng cho luân chuyển tài sản. Người gọi được xem nếu là:
      - Người bàn giao;
      - Người nhận;
      - Hoặc admin.
     */
    public void ensurePartyOrAny(Long fromEmployeeId, Long toEmployeeId, Set<Permission> adminPermissions) {
        if (hasAnyPermission(adminPermissions.toArray(Permission[]::new))) return;
        Long currentEmployeeId = this.getCurrentEmployeeId();
        if (fromEmployeeId != null && (Objects.equals(currentEmployeeId, fromEmployeeId) || Objects.equals(currentEmployeeId, toEmployeeId))) return;
        throw new AccessDeniedException("Không có quyền truy cập tài sản này");
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
