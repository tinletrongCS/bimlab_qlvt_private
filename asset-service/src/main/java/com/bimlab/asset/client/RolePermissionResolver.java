package com.bimlab.asset.client;

import java.util.List;

/**
 * PA-B (Keycloak SSO): resolve một role-string → danh sách permission key (raw snake_case).
 * Token Keycloak chỉ mang `role`; resource-server dùng resolver này để lấy quyền.
 * Tách interface để converter test được mà không cần RestTemplate thật.
 */
public interface RolePermissionResolver {

    /** Trả permission keys của role. KHÔNG bao giờ null (rỗng nếu không resolve được/role trống). */
    List<String> resolve(String role);
}
