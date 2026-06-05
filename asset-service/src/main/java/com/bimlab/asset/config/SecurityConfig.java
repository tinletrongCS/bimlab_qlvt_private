package com.bimlab.asset.config;

import com.bimlab.asset.security.CsrfCookieFilter;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManagerResolver;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

import java.util.Set;

// Q1: @EnableMethodSecurity is the prerequisite for @PreAuthorize annotations
// on QLVT controllers. Without it, every @PreAuthorize silently no-ops and
// authorization regresses to whatever imperative checks remain in the method
// body — a hard-to-spot security regression.
//
// F6 (Phase A): enables CSRF protection to match HRM auth-service +
// employee-service + attendance-service + CDS project-service +
// task-service. The SPA cookie→header pattern is configured via
// CookieCsrfTokenRepository.withHttpOnlyFalse() so axios xsrfCookieName +
// xsrfHeaderName picks up the value automatically.
@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    // Keycloak-only resource server: token verify qua AuthenticationManagerResolver
    // (issuer + aud + azp) và BearerTokenResolver (cookie/Authorization). Cả hai bean
    // do KeycloakResourceServerConfig cung cấp.
    private final AuthenticationManagerResolver<HttpServletRequest> keycloakAuthManagerResolver;
    private final BearerTokenResolver keycloakBearerTokenResolver;

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .csrfTokenRequestHandler(csrfRequestHandler())
                        // Internal-service / actuator paths bypass CSRF: they don't
                        // accept browser cookies, so requiring X-XSRF-TOKEN would
                        // break service-to-service calls.
                        .ignoringRequestMatchers(
                                "/actuator/**",
                                "/internal/**"
                        )
                        // Phase 1: CSRF chỉ áp cho request dựa COOKIE (credential ambient của SPA).
                        // Request mang `Authorization: Bearer` (token Keycloak, mobile, service) KHÔNG
                        // ambient — trình duyệt cross-site không thể tự gắn header này → miễn nhiễm CSRF.
                        // Không có dòng này, ghi (POST/PUT/DELETE) qua bearer sẽ bị 403 vì thiếu XSRF cookie.
                        .requireCsrfProtectionMatcher(SecurityConfig::requiresCsrf)
                )
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/prometheus").permitAll()
                        .anyRequest().authenticated())
                .addFilterAfter(new CsrfCookieFilter(), UsernamePasswordAuthenticationFilter.class);

        http.oauth2ResourceServer(oauth2 -> oauth2
                .bearerTokenResolver(keycloakBearerTokenResolver)
                .authenticationManagerResolver(keycloakAuthManagerResolver));
        return http.build();
    }

    /**
     * SPA CSRF handler — disables Spring Security 6's default XOR-encoded
     * request attribute so the SPA's cookie→header pattern (axios
     * xsrfCookieName/xsrfHeaderName) sends the raw token. Without this
     * Spring expects the XOR-masked token in the header, which axios
     * cannot produce, and every write request would fail with 403.
     */
    private static CsrfTokenRequestAttributeHandler csrfRequestHandler() {
        CsrfTokenRequestAttributeHandler handler = new CsrfTokenRequestAttributeHandler();
        handler.setCsrfRequestAttributeName(null);
        return handler;
    }

    // HTTP method "an toàn" (read-only) — Spring mặc định không bảo vệ CSRF cho các method này.
    private static final Set<String> CSRF_SAFE_METHODS = Set.of("GET", "HEAD", "TRACE", "OPTIONS");

    /**
     * Yêu cầu CSRF khi: method ghi (không thuộc nhóm an toàn) VÀ request KHÔNG mang
     * `Authorization: Bearer` (tức là dựa cookie ambient). Bearer-authenticated request
     * được miễn vì không thể bị giả mạo cross-site.
     */
    private static boolean requiresCsrf(HttpServletRequest request) {
        if (CSRF_SAFE_METHODS.contains(request.getMethod())) {
            return false;
        }
        String authHeader = request.getHeader("Authorization");
        return authHeader == null || !authHeader.startsWith("Bearer ");
    }
}
