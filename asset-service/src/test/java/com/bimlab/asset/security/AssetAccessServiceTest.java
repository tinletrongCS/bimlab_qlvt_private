package com.bimlab.asset.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

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

    private void authenticateAs(Long employeeId, String... permissions) {
        AssetPrincipal principal = new AssetPrincipal("user-" + employeeId, employeeId);
        var authorities = java.util.Arrays.stream(permissions)
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
        authenticateAs(42L, "asset_view_self");
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
        authenticateAs(1L, "asset_manage");
        assertTrue(access.hasAnyPermission("asset_manage", "asset_view_all"));
    }

    @Test
    void hasAnyPermission_falseWhenNoMatch() {
        authenticateAs(1L, "asset_view_self");
        assertFalse(access.hasAnyPermission("asset_manage"));
    }

    // ── ensureSelfOrAny ───────────────────────────────────────────────────

    @Test
    void ensureSelfOrAny_pass_whenAdminPermission() {
        authenticateAs(99L, "asset_manage");
        assertDoesNotThrow(() -> access.ensureSelfOrAny(42L, "asset_view_team", "asset_manage"));
    }

    @Test
    void ensureSelfOrAny_pass_whenOwnerMatchesCurrent() {
        authenticateAs(42L, "asset_view_self");
        assertDoesNotThrow(() -> access.ensureSelfOrAny(42L, "asset_manage"));
    }

    @Test
    void ensureSelfOrAny_deny_whenDifferentOwnerAndNoAdminPerm() {
        authenticateAs(42L, "asset_view_self");
        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> access.ensureSelfOrAny(99L, "asset_manage"));
        assertEquals("Không có quyền truy cập tài nguyên này", ex.getMessage());
    }

    @Test
    void ensureSelfOrAny_deny_whenOwnerNull_andNoAdminPerm() {
        // Master-data resources (Contract/Vendor/Subscription) pass null →
        // require admin perm. Self-scoped users must be rejected.
        authenticateAs(42L, "asset_view_self");
        assertThrows(AccessDeniedException.class,
                () -> access.ensureSelfOrAny(null, "asset_manage"));
    }

    @Test
    void ensureSelfOrAny_pass_whenOwnerNull_butAdminPerm() {
        authenticateAs(99L, "asset_manage");
        assertDoesNotThrow(() -> access.ensureSelfOrAny(null, "asset_manage"));
    }

    @Test
    void ensureSelfOrAny_deny_whenEmployeeIdMissing() {
        // Caller has no employeeId claim (legacy session) and no admin perm.
        authenticateAs(null, "asset_view_self");
        assertThrows(AccessDeniedException.class,
                () -> access.ensureSelfOrAny(42L, "asset_manage"));
    }

    // ── ensurePartyOrAny ──────────────────────────────────────────────────

    @Test
    void ensurePartyOrAny_pass_whenCallerIsFromParty() {
        authenticateAs(7L, "asset_view_self");
        assertDoesNotThrow(() -> access.ensurePartyOrAny(7L, 99L, "asset_manage"));
    }

    @Test
    void ensurePartyOrAny_pass_whenCallerIsToParty() {
        authenticateAs(99L, "asset_view_self");
        assertDoesNotThrow(() -> access.ensurePartyOrAny(7L, 99L, "asset_manage"));
    }

    @Test
    void ensurePartyOrAny_pass_whenAdmin() {
        authenticateAs(1L, "asset_manage");
        assertDoesNotThrow(() -> access.ensurePartyOrAny(7L, 99L, "asset_manage"));
    }

    @Test
    void ensurePartyOrAny_deny_whenNeitherPartyNorAdmin() {
        authenticateAs(50L, "asset_view_self");
        assertThrows(AccessDeniedException.class,
                () -> access.ensurePartyOrAny(7L, 99L, "asset_manage"));
    }

    // ── existing ensureAccess (regression guard) ──────────────────────────

    @Test
    void ensureAccess_deny_whenUnauthenticated() {
        assertThrows(AccessDeniedException.class, access::ensureAccess);
    }

    @Test
    void ensureAccess_pass_whenHasAnyQlvtPermission() {
        authenticateAs(1L, "asset_view_self");
        assertDoesNotThrow(access::ensureAccess);
    }
}
