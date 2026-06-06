package com.bimlab.asset.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * F6: forces Spring Security to materialize the CSRF token early in the
 * request lifecycle so the {@code XSRF-TOKEN} cookie is set on the
 * response. Without this, the cookie is only emitted lazily on requests
 * that explicitly access the token, which leaves the SPA without a
 * value to echo back in {@code X-XSRF-TOKEN}.
 *
 * <p>Mirror of {@code com.bimlab.hrm.employee.security.CsrfCookieFilter},
 * kept per-service (each service owns its CSRF filter).
 */
public class CsrfCookieFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (csrfToken != null) csrfToken.getToken();
        filterChain.doFilter(request, response);
    }
}
