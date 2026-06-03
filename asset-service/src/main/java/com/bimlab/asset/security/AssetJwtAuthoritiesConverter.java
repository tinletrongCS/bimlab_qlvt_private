package com.bimlab.asset.security;

import com.bimlab.asset.client.RolePermissionResolver;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.ArrayList;
import java.util.List;

/**
 * Keycloak SSO — chuyển một {@link Jwt} đã verify (legacy HOẶC Keycloak) thành Authentication:
 *   authorities = ROLE_&lt;role&gt; + permission keys (raw snake_case),
 *   principal   = {@link AssetPrincipal}(username, employeeId).
 *
 * <p><b>PA-B (role-only token):</b> permissions lấy theo 2 nhánh phân biệt bằng DECODER NÀO verify token
 * (issuer), KHÔNG đoán theo claim — mỗi issuer dùng 1 instance converter riêng (xem
 * {@code KeycloakResourceServerConfig}):
 * <ul>
 *   <li><b>Legacy</b> ({@code resolveFromApi=false}): dùng claim {@code permissions} (kể cả rỗng) →
 *       KHÔNG bao giờ gọi resolver → authorities byte-identical filter cũ (rollback gate Phase 1).</li>
 *   <li><b>Keycloak</b> ({@code resolveFromApi=true}): LUÔN resolve role→permissions qua
 *       {@link RolePermissionResolver}, BỎ QUA mọi claim permissions (defense: ai thêm mapper tay trên
 *       KC cũng không bypass được).</li>
 * </ul>
 */
public final class AssetJwtAuthoritiesConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final RolePermissionResolver resolver;
    private final boolean resolveFromApi;

    /**
     * @param resolver      nguồn resolve role→permissions (auth-service).
     * @param resolveFromApi {@code true} = converter cho issuer KEYCLOAK (luôn resolve role, BỎ QUA mọi
     *                       claim permissions — defense nếu ai thêm mapper tay); {@code false} = issuer
     *                       LEGACY (dùng claim permissions kể cả rỗng, KHÔNG bao giờ gọi API = rollback gate).
     *                       Quyết định dựa trên DECODER nào verify token (issuer), không đoán claim.
     */
    public AssetJwtAuthoritiesConverter(RolePermissionResolver resolver, boolean resolveFromApi) {
        this.resolver = resolver;
        this.resolveFromApi = resolveFromApi;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        String username = jwt.getSubject();
        String role = jwt.getClaimAsString("role");
        List<String> permissions;
        if (resolveFromApi) {
            // Keycloak (PA-B): LUÔN resolve role→permissions; bỏ qua mọi claim permissions có thể có.
            permissions = resolver.resolve(role);
        } else {
            // Legacy: dùng claim permissions (kể cả [] rỗng); KHÔNG gọi API (giữ authorities y hệt filter cũ).
            permissions = jwt.getClaimAsStringList("permissions");
        }
        if (permissions == null) {
            permissions = List.of();
        }
        Long employeeId = parseEmployeeId(jwt.getClaim("employeeId"));

        List<GrantedAuthority> authorities = new ArrayList<>();
        if (role != null && !role.isBlank()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
        }
        permissions.forEach(permission -> authorities.add(new SimpleGrantedAuthority(permission)));

        AssetPrincipal principal = new AssetPrincipal(username, employeeId);
        // Giữ shape giống filter cũ: principal = AssetPrincipal, credentials = jwt.
        return new UsernamePasswordAuthenticationToken(principal, jwt, authorities);
    }

    /** Khớp JwtTokenProvider.getEmployeeId: Number hoặc String số → Long, ngược lại null. */
    static Long parseEmployeeId(Object value) {
        if (value instanceof Number n) {
            return n.longValue();
        }
        if (value instanceof String s && !s.isBlank()) {
            try {
                return Long.parseLong(s);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
