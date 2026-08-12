package com.bimlab.asset.controller;

import com.bimlab.asset.dto.response.CurrentUserResponse;
import com.bimlab.asset.security.AssetPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

/**
 * PA-B (Keycloak SSO): nguồn permission cho FE QLVT.
 *
 * <p>Token Keycloak chỉ mang `role` (không permissions) → FE KHÔNG decode quyền từ token được.
 * Endpoint này trả {@code {username, role, employeeId, permissions[]}} đọc TỪ SecurityContext —
 * authorities đã được converter resolve sẵn (legacy: từ claim; Keycloak: resolve role→permissions).
 * → MODE-AGNOSTIC: đúng cho cả token cũ lẫn Keycloak. FE gọi đây thay cho `/auth/me` (HRM) khi ở
 * chế độ Keycloak để ẩn/hiện nút theo quyền.
 *
 * <p>Chỉ yêu cầu authenticated (mọi user xem được quyền CỦA CHÍNH MÌNH) — không cần @PreAuthorize.
 */
@RestController
@RequestMapping("/api/asset")
public class MeController {

    @GetMapping("/me")
    public ResponseEntity<CurrentUserResponse> me() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        String role = null;
        List<String> permissions = new ArrayList<>();
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String value = authority.getAuthority();
            if (value.startsWith("ROLE_")) {
                role = value.substring("ROLE_".length());
            } else {
                permissions.add(value);
            }
        }
        Long employeeId = null;
        if (authentication.getPrincipal() instanceof AssetPrincipal principal) {
            employeeId = principal.employeeId();
        }

        return ResponseEntity.ok(new CurrentUserResponse(
                authentication.getName(),
                role,
                employeeId,
                List.copyOf(permissions)
        ));
    }
}
