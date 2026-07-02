package com.bimlab.asset.security;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Locks the canonical authority-string for every {@link Permission} value and
 * the membership of every {@link Permission.Sets} constant. Any rename or
 * drift between this enum and the JWT authority claim will break here before
 * it can silently disable {@code @PreAuthorize} guards in controllers.
 */
class PermissionTest {

    @Test
    void code_isStableForEveryEnumValue() {
        assertEquals("asset_access", Permission.ASSET_ACCESS.code());
        assertEquals("asset_view_self", Permission.ASSET_VIEW_SELF.code());
        assertEquals("asset_view_team", Permission.ASSET_VIEW_TEAM.code());
        assertEquals("asset_view_all", Permission.ASSET_VIEW_ALL.code());
        assertEquals("asset_manage", Permission.ASSET_MANAGE.code());
        assertEquals("asset_finance_manage", Permission.ASSET_FINANCE_MANAGE.code());
        assertEquals("asset_finance_view", Permission.ASSET_FINANCE_VIEW.code());
        assertEquals("asset_report_view", Permission.ASSET_REPORT_VIEW.code());
        assertEquals("vendor_manage", Permission.VENDOR_MANAGE.code());
        assertEquals("subscription_manage", Permission.SUBSCRIPTION_MANAGE.code());
        assertEquals("purchase_request_create", Permission.PURCHASE_REQUEST_CREATE.code());
        assertEquals("purchase_request_approve", Permission.PURCHASE_REQUEST_APPROVE.code());
        assertEquals("contract_manage", Permission.CONTRACT_MANAGE.code());
        assertEquals("maintenance_manage", Permission.MAINTENANCE_MANAGE.code());
    }

    @Test
    void allValuesCovered_noStrayEnumEntries() {
        // Lock total count so adding a value without updating tests fails loudly.
        assertEquals(14, Permission.values().length);
    }

    @Test
    void financeViewers_locksMaskingScope() {
        Set<Permission> set = Permission.Sets.FINANCE_VIEWERS;
        assertEquals(3, set.size());
        assertTrue(set.contains(Permission.ASSET_FINANCE_VIEW));
        assertTrue(set.contains(Permission.ASSET_FINANCE_MANAGE));
        // asset_manage nhập/sửa trường tiền tệ nên phải thấy tài chính.
        assertTrue(set.contains(Permission.ASSET_MANAGE));
    }

    @Test
    void assetAdmin_locksWave1Shape() {
        Set<Permission> set = Permission.Sets.ASSET_ADMIN;
        assertEquals(4, set.size());
        assertTrue(set.contains(Permission.ASSET_VIEW_TEAM));
        assertTrue(set.contains(Permission.ASSET_VIEW_ALL));
        assertTrue(set.contains(Permission.ASSET_MANAGE));
        assertTrue(set.contains(Permission.ASSET_FINANCE_MANAGE));
    }

    @Test
    void transferAdmin_aliasesAssetAdmin() {
        assertEquals(Permission.Sets.ASSET_ADMIN, Permission.Sets.TRANSFER_ADMIN);
    }

    @Test
    void maintAdmin_excludesFinance_byDesign() {
        Set<Permission> set = Permission.Sets.MAINT_ADMIN;
        assertEquals(4, set.size());
        assertTrue(set.contains(Permission.MAINTENANCE_MANAGE));
        assertTrue(set.contains(Permission.ASSET_MANAGE));
        assertTrue(set.contains(Permission.ASSET_VIEW_TEAM));
        assertTrue(set.contains(Permission.ASSET_VIEW_ALL));
        assertFalse(set.contains(Permission.ASSET_FINANCE_MANAGE));
    }

    @Test
    void prAdmin_excludesViewTeam_byDesign() {
        Set<Permission> set = Permission.Sets.PR_ADMIN;
        assertEquals(4, set.size());
        assertTrue(set.contains(Permission.PURCHASE_REQUEST_APPROVE));
        assertTrue(set.contains(Permission.ASSET_FINANCE_MANAGE));
        assertTrue(set.contains(Permission.ASSET_MANAGE));
        assertTrue(set.contains(Permission.ASSET_VIEW_ALL));
        assertFalse(set.contains(Permission.ASSET_VIEW_TEAM));
    }

    @Test
    void contractAdmin_shape() {
        Set<Permission> set = Permission.Sets.CONTRACT_ADMIN;
        assertEquals(4, set.size());
        assertTrue(set.contains(Permission.CONTRACT_MANAGE));
        assertTrue(set.contains(Permission.ASSET_FINANCE_MANAGE));
        assertTrue(set.contains(Permission.ASSET_MANAGE));
        assertTrue(set.contains(Permission.ASSET_VIEW_ALL));
    }

    @Test
    void vendorAdmin_shape() {
        Set<Permission> set = Permission.Sets.VENDOR_ADMIN;
        assertEquals(3, set.size());
        assertTrue(set.contains(Permission.VENDOR_MANAGE));
        assertTrue(set.contains(Permission.ASSET_MANAGE));
        assertTrue(set.contains(Permission.ASSET_VIEW_ALL));
    }

    @Test
    void subscriptionAdmin_shape() {
        Set<Permission> set = Permission.Sets.SUBSCRIPTION_ADMIN;
        assertEquals(3, set.size());
        assertTrue(set.contains(Permission.SUBSCRIPTION_MANAGE));
        assertTrue(set.contains(Permission.ASSET_MANAGE));
        assertTrue(set.contains(Permission.ASSET_VIEW_ALL));
    }

    @Test
    void codesOf_returnsAuthorityStrings() {
        String[] codes = Permission.codesOf(Permission.Sets.VENDOR_ADMIN);
        assertNotNull(codes);
        assertEquals(3, codes.length);
        Set<String> codeSet = Set.of(codes);
        assertTrue(codeSet.contains("vendor_manage"));
        assertTrue(codeSet.contains("asset_manage"));
        assertTrue(codeSet.contains("asset_view_all"));
    }
}
