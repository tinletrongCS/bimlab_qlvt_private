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

    /*
    BÀN GIAO TÀI SẢN
    asset_transfers_view: chỉ xem được phiếu bàn giao
    asset_transfers_manage: được quyền thêm/sửa/xóa phiếu bàn giao
    asset_transfers_approve: được quyền duyệt hoặc từ chối phiếu bàn giao
    */
    ASSET_TRANSFERS_VIEW("asset_transfers_view"),
    ASSET_TRANSFERS_MANAGE("asset_transfers_manage"),
    ASSET_TRANSFERS_APPROVE("asset_transfers_approve"),

    /*
    NHÀ CUNG CẤP, GÓI ĐĂNG KÝ, YÊU CẦU MUA SẮM, HỢP ĐỒNG, BẢO TRÌ
     */
    VENDOR_MANAGE("vendor_manage"),
    SUBSCRIPTION_MANAGE("subscription_manage"),
    PURCHASE_REQUEST_CREATE("purchase_request_create"),
    PURCHASE_REQUEST_APPROVE("purchase_request_approve"),
    CONTRACT_MANAGE("contract_manage"),
    MAINTENANCE_MANAGE("maintenance_manage"),

    /*
    DANH MỤC CÁC LOẠI LOG
     */
    LOG_DEFINITION_VIEW("log_definition_view"),
    LOG_DEFINITION_MANAGE("log_definition_manage");
    
    private final String code;

    Permission(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }
    public static String[] codesOf(Set<Permission> permissions) {
        return permissions.stream().map(Permission::code).toArray(String[]::new);
    }

    public static final class Sets {
        private Sets() {}

        public static final Set<Permission> ASSET_ADMIN = Set.of(
                ASSET_VIEW_TEAM, ASSET_VIEW_ALL, ASSET_MANAGE, ASSET_FINANCE_MANAGE);

        public static final Set<Permission> FINANCE_VIEWERS = Set.of(
                ASSET_FINANCE_VIEW, ASSET_FINANCE_MANAGE, ASSET_MANAGE);
        
        public static final Set<Permission> TRANSFER_VIEWERS = Set.of(
                ASSET_TRANSFERS_VIEW, ASSET_TRANSFERS_MANAGE, ASSET_TRANSFERS_APPROVE,
                ASSET_VIEW_TEAM, ASSET_VIEW_ALL, ASSET_MANAGE, ASSET_FINANCE_MANAGE);
        
        public static final Set<Permission> TRANSFER_ADMIN = Set.of(
                ASSET_TRANSFERS_MANAGE, ASSET_TRANSFERS_APPROVE,
                ASSET_VIEW_TEAM, ASSET_VIEW_ALL, ASSET_MANAGE, ASSET_FINANCE_MANAGE);

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

        public static final Set<Permission> LOG_DEFINITION_VIEWERS = Set.of(
                LOG_DEFINITION_VIEW);

        public static final Set<Permission> LOG_DEFINITION_ADMIN = Set.of(
                LOG_DEFINITION_VIEW, LOG_DEFINITION_MANAGE);
    }
}
