package com.bimlab.asset.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;

/**
 * Phase 1 — resolver lấy token cho resource-server từ cookie {@code jwt} TRƯỚC,
 * rồi mới tới header {@code Authorization: Bearer}. Giữ đúng flow cookie-based của
 * hệ cũ (JwtAuthenticationFilter đọc cookie "jwt") khi bật đường Keycloak. Default
 * resolver của Spring chỉ đọc header nên không đủ.
 */
public final class CookieBearerTokenResolver implements BearerTokenResolver {

    private final DefaultBearerTokenResolver delegate = new DefaultBearerTokenResolver();

    @Override
    public String resolve(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("jwt".equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                    return cookie.getValue();
                }
            }
        }
        return delegate.resolve(request);
    }
}
