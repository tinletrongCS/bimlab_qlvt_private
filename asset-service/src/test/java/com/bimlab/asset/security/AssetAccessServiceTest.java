package com.bimlab.asset.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AssetAccessServiceTest {

    private final AssetAccessService access = new AssetAccessService();

    @BeforeEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAs(Long employeeId, Permission... permissions) {
        AssetPrincipal principal = new AssetPrincipal("user-" + employeeId, employeeId);
        var authorities = java.util.Arrays.stream(permissions)
                .map(Permission::code)
                .map(SimpleGrantedAuthority::new)
                .toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, authorities));
    }

    @Test
    void getCurrentEmployeeId_returnsNull_whenNotAuthenticated() {
        assertNull(access.getCurrentEmployeeId());
    }

    @Test
    void getCurrentEmployeeId_returnsId_fromAssetPrincipal() {
        authenticateAs(42L, Permission.ASSET_VIEW_SELF);
        assertEquals(42L, access.getCurrentEmployeeId());
    }

    @Test
    void getCurrentEmployeeId_returnsNull_whenPrincipalIsNotAssetPrincipal() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("alice", null, List.of()));
        assertNull(access.getCurrentEmployeeId());
    }

    @Test
    void hasAnyPermission_trueWhenMatching() {
        authenticateAs(1L, Permission.ASSET_MANAGE);
        assertTrue(access.hasAnyPermission(Permission.ASSET_MANAGE, Permission.ASSET_VIEW_ALL));
    }

    @Test
    void hasAnyPermission_falseWhenNoMatch() {
        authenticateAs(1L, Permission.ASSET_VIEW_SELF);
        assertFalse(access.hasAnyPermission(Permission.ASSET_MANAGE));
    }

    // ── ensureSelfOrAny ───────────────────────────────────────────────────

    @Test
    void ensureSelfOrAny_pass_whenAdminPermission() {
        authenticateAs(99L, Permission.ASSET_MANAGE);
        assertDoesNotThrow(() -> access.ensureSelfOrAny(42L,
                Set.of(Permission.ASSET_VIEW_TEAM, Permission.ASSET_MANAGE)));
    }

    @Test
    void ensureSelfOrAny_pass_whenOwnerMatchesCurrent() {
        authenticateAs(42L, Permission.ASSET_VIEW_SELF);
        assertDoesNotThrow(() -> access.ensureSelfOrAny(42L, Set.of(Permission.ASSET_MANAGE)));
    }

    @Test
    void ensureSelfOrAny_deny_whenDifferentOwnerAndNoAdminPerm() {
        authenticateAs(42L, Permission.ASSET_VIEW_SELF);
        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> access.ensureSelfOrAny(99L, Set.of(Permission.ASSET_MANAGE)));
        assertEquals("Không có quyền truy cập tài nguyên này", ex.getMessage());
    }

    @Test
    void ensureSelfOrAny_deny_whenOwnerNull_andNoAdminPerm() {
        // Master-data resources (Contract/Vendor/Subscription) pass null →
        // require admin perm. Self-scoped users must be rejected.
        authenticateAs(42L, Permission.ASSET_VIEW_SELF);
        assertThrows(AccessDeniedException.class,
                () -> access.ensureSelfOrAny(null, Set.of(Permission.ASSET_MANAGE)));
    }

    @Test
    void ensureSelfOrAny_pass_whenOwnerNull_butAdminPerm() {
        authenticateAs(99L, Permission.ASSET_MANAGE);
        assertDoesNotThrow(() -> access.ensureSelfOrAny(null, Set.of(Permission.ASSET_MANAGE)));
    }

    @Test
    void ensureSelfOrAny_deny_whenEmployeeIdMissing() {
        // Caller has no employeeId claim (legacy session) and no admin perm.
        authenticateAs(null, Permission.ASSET_VIEW_SELF);
        assertThrows(AccessDeniedException.class,
                () -> access.ensureSelfOrAny(42L, Set.of(Permission.ASSET_MANAGE)));
    }

    // ── ensurePartyOrAny ──────────────────────────────────────────────────

    @Test
    void ensurePartyOrAny_pass_whenCallerIsFromParty() {
        authenticateAs(7L, Permission.ASSET_VIEW_SELF);
        assertDoesNotThrow(() -> access.ensurePartyOrAny(7L, 99L, Set.of(Permission.ASSET_MANAGE)));
    }

    @Test
    void ensurePartyOrAny_pass_whenCallerIsToParty() {
        authenticateAs(99L, Permission.ASSET_VIEW_SELF);
        assertDoesNotThrow(() -> access.ensurePartyOrAny(7L, 99L, Set.of(Permission.ASSET_MANAGE)));
    }

    @Test
    void ensurePartyOrAny_pass_whenAdmin() {
        authenticateAs(1L, Permission.ASSET_MANAGE);
        assertDoesNotThrow(() -> access.ensurePartyOrAny(7L, 99L, Set.of(Permission.ASSET_MANAGE)));
    }

    @Test
    void ensurePartyOrAny_deny_whenNeitherPartyNorAdmin() {
        authenticateAs(50L, Permission.ASSET_VIEW_SELF);
        assertThrows(AccessDeniedException.class,
                () -> access.ensurePartyOrAny(7L, 99L, Set.of(Permission.ASSET_MANAGE)));
    }

    // ── ensureAccess ──────────────────────────────────────────────────────

    @Test
    void ensureAccess_deny_whenUnauthenticated() {
        assertThrows(AccessDeniedException.class, access::ensureAccess);
    }

    @Test
    void ensureAccess_pass_whenHasAnyQlvtPermission() {
        authenticateAs(1L, Permission.ASSET_VIEW_SELF);
        assertDoesNotThrow(access::ensureAccess);
    }

    @Test
    void ensureAccess_deny_whenAuthenticatedButNoQlvtPermission() {
        authenticateAs(1L /* no perms */);
        assertThrows(AccessDeniedException.class, access::ensureAccess);
    }

    // ── ensureXxx: Q1 new coverage for previously-untested gates ─────────

    @Test
    void ensureAssetManage_pass_whenAssetManage() {
        authenticateAs(1L, Permission.ASSET_MANAGE);
        assertDoesNotThrow(access::ensureAssetManage);
    }

    @Test
    void ensureAssetManage_deny_whenOnlyViewSelf() {
        authenticateAs(1L, Permission.ASSET_VIEW_SELF);
        assertThrows(AccessDeniedException.class, access::ensureAssetManage);
    }

    @Test
    void ensureVendorManage_pass_whenVendorManage() {
        authenticateAs(1L, Permission.VENDOR_MANAGE);
        assertDoesNotThrow(access::ensureVendorManage);
    }

    @Test
    void ensureVendorManage_pass_whenAssetManage() {
        authenticateAs(1L, Permission.ASSET_MANAGE);
        assertDoesNotThrow(access::ensureVendorManage);
    }

    @Test
    void ensureVendorManage_deny_whenOnlyViewAll() {
        authenticateAs(1L, Permission.ASSET_VIEW_ALL);
        assertThrows(AccessDeniedException.class, access::ensureVendorManage);
    }

    @Test
    void ensureSubscriptionManage_pass_whenSubscriptionManage() {
        authenticateAs(1L, Permission.SUBSCRIPTION_MANAGE);
        assertDoesNotThrow(access::ensureSubscriptionManage);
    }

    @Test
    void ensureSubscriptionManage_deny_whenOnlyContractManage() {
        authenticateAs(1L, Permission.CONTRACT_MANAGE);
        assertThrows(AccessDeniedException.class, access::ensureSubscriptionManage);
    }

    @Test
    void ensurePurchaseCreate_pass_whenPurchaseRequestCreate() {
        authenticateAs(1L, Permission.PURCHASE_REQUEST_CREATE);
        assertDoesNotThrow(access::ensurePurchaseCreate);
    }

    @Test
    void ensurePurchaseCreate_deny_whenOnlyApprove() {
        // Approve perm does NOT grant create — separation of duty.
        authenticateAs(1L, Permission.PURCHASE_REQUEST_APPROVE);
        assertThrows(AccessDeniedException.class, access::ensurePurchaseCreate);
    }

    @Test
    void ensurePurchaseApprove_pass_whenApprove() {
        authenticateAs(1L, Permission.PURCHASE_REQUEST_APPROVE);
        assertDoesNotThrow(access::ensurePurchaseApprove);
    }

    @Test
    void ensurePurchaseApprove_pass_whenFinanceManage() {
        authenticateAs(1L, Permission.ASSET_FINANCE_MANAGE);
        assertDoesNotThrow(access::ensurePurchaseApprove);
    }

    @Test
    void ensurePurchaseApprove_deny_whenOnlyCreate() {
        authenticateAs(1L, Permission.PURCHASE_REQUEST_CREATE);
        assertThrows(AccessDeniedException.class, access::ensurePurchaseApprove);
    }

    @Test
    void ensureContractManage_pass_whenContractManage() {
        authenticateAs(1L, Permission.CONTRACT_MANAGE);
        assertDoesNotThrow(access::ensureContractManage);
    }

    @Test
    void ensureContractManage_pass_whenFinanceManage() {
        authenticateAs(1L, Permission.ASSET_FINANCE_MANAGE);
        assertDoesNotThrow(access::ensureContractManage);
    }

    @Test
    void ensureContractManage_deny_whenOnlyViewAll() {
        authenticateAs(1L, Permission.ASSET_VIEW_ALL);
        assertThrows(AccessDeniedException.class, access::ensureContractManage);
    }

    @Test
    void ensureMaintenanceManage_pass_whenMaintenanceManage() {
        authenticateAs(1L, Permission.MAINTENANCE_MANAGE);
        assertDoesNotThrow(access::ensureMaintenanceManage);
    }

    @Test
    void ensureMaintenanceManage_deny_whenOnlyFinanceManage() {
        // Finance manage does NOT grant maintenance — by design (MAINT_ADMIN excludes finance).
        authenticateAs(1L, Permission.ASSET_FINANCE_MANAGE);
        assertThrows(AccessDeniedException.class, access::ensureMaintenanceManage);
    }

    @Test
    void ensureReportView_pass_whenReportView() {
        authenticateAs(1L, Permission.ASSET_REPORT_VIEW);
        assertDoesNotThrow(access::ensureReportView);
    }

    @Test
    void ensureReportView_pass_whenViewAll() {
        authenticateAs(1L, Permission.ASSET_VIEW_ALL);
        assertDoesNotThrow(access::ensureReportView);
    }

    @Test
    void ensureReportView_deny_whenOnlyViewSelf() {
        authenticateAs(1L, Permission.ASSET_VIEW_SELF);
        assertThrows(AccessDeniedException.class, access::ensureReportView);
    }
}
