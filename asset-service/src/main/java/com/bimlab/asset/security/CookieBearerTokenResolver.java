package com.bimlab.asset.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;

/**
 * Resolve bearer tokens for the resource server.
 *
 * <p>Keycloak SPA requests send {@code Authorization: Bearer ...}; that header
 * must win over any legacy {@code jwt} cookie that may still be present in the
 * browser. The cookie remains only as a compatibility fallback.
 */
public final class CookieBearerTokenResolver implements BearerTokenResolver {

    private final DefaultBearerTokenResolver delegate = new DefaultBearerTokenResolver();

    @Override
    public String resolve(HttpServletRequest request) {
        String headerToken = delegate.resolve(request);
        if (headerToken != null && !headerToken.isBlank()) {
            return headerToken;
        }
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("jwt".equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}
