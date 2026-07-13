package com.bimlab.asset.security;

import java.util.Set;

/**
 * Type-safe enumeration of every QLVT permission authority that may
 * appear in the {@code permissions} claim of a JWT. The {@link #code()}
 * value is the wire-format authority string (matched against
 * {@code SimpleGrantedAuthority.getAuthority()}).
 *
 * <p>Every {@code @PreAuthorize} expression in QLVT controllers references
 * a literal that is locked against this enum via {@code PermissionTest}.
 * Adding or renaming a value without updating that test will fail the build.
 */
public enum Permission {
    ASSET_ACCESS("asset_access"),
    ASSET_VIEW_SELF("asset_view_self"),
    ASSET_VIEW_TEAM("asset_view_team"),
    ASSET_VIEW_ALL("asset_view_all"),
    ASSET_MANAGE("asset_manage"),
    ASSET_FINANCE_MANAGE("asset_finance_manage"),
    ASSET_FINANCE_VIEW("asset_finance_view"),
    ASSET_REPORT_VIEW("asset_report_view"),
    VENDOR_MANAGE("vendor_manage"),
    SUBSCRIPTION_MANAGE("subscription_manage"),
    PURCHASE_REQUEST_CREATE("purchase_request_create"),
    PURCHASE_REQUEST_APPROVE("purchase_request_approve"),
    CONTRACT_MANAGE("contract_manage"),
    MAINTENANCE_MANAGE("maintenance_manage");

    private final String code;

    Permission(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    /**
     * Convert a permission set to the authority-string array that
     * {@link org.springframework.security.core.GrantedAuthority#getAuthority()}
     * matches against. Order is undefined.
     */
    public static String[] codesOf(Set<Permission> permissions) {
        return permissions.stream().map(Permission::code).toArray(String[]::new);
    }

    /**
     * Canonical admin-permission groupings. Each constant matches the
     * wave-1 controller arrays. Asymmetry is intentional:
     * <ul>
     *   <li>{@link #MAINT_ADMIN} excludes {@code asset_finance_manage}
     *       — maintenance is not a finance scope.</li>
     *   <li>{@link #PR_ADMIN} excludes {@code asset_view_team}
     *       — PR detail visibility is approver+all-view only.</li>
     * </ul>
     * Changing these sets is a behaviour change, not a refactor.
     */
    public static final class Sets {
        private Sets() {}

        public static final Set<Permission> ASSET_ADMIN = Set.of(
                ASSET_VIEW_TEAM, ASSET_VIEW_ALL, ASSET_MANAGE, ASSET_FINANCE_MANAGE);

        /**
         * Ai được thấy dữ liệu tài chính của tài sản (nguyên giá, khấu hao,
         * giá trị sổ sách...). {@code asset_manage} nằm trong set vì người
         * quản lý tài sản nhập/sửa các trường tiền tệ khi tạo và cập nhật.
         */
        public static final Set<Permission> FINANCE_VIEWERS = Set.of(
                ASSET_FINANCE_VIEW, ASSET_FINANCE_MANAGE, ASSET_MANAGE);

        public static final Set<Permission> TRANSFER_ADMIN = ASSET_ADMIN;

        public static final Set<Permission> MAINT_ADMIN = Set.of(
                MAINTENANCE_MANAGE, ASSET_MANAGE, ASSET_VIEW_TEAM, ASSET_VIEW_ALL);

        public static final Set<Permission> PR_ADMIN = Set.of(
                PURCHASE_REQUEST_APPROVE, ASSET_FINANCE_MANAGE, ASSET_MANAGE, ASSET_VIEW_ALL);

        public static final Set<Permission> CONTRACT_ADMIN = Set.of(
                CONTRACT_MANAGE, ASSET_FINANCE_MANAGE, ASSET_MANAGE, ASSET_VIEW_ALL);

        public static final Set<Permission> VENDOR_ADMIN = Set.of(
                VENDOR_MANAGE, ASSET_MANAGE, ASSET_VIEW_ALL);

        public static final Set<Permission> SUBSCRIPTION_ADMIN = Set.of(
                SUBSCRIPTION_MANAGE, ASSET_MANAGE, ASSET_VIEW_ALL);
    }
}
