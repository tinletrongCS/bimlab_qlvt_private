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


@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private final AuthenticationManagerResolver<HttpServletRequest> keycloakAuthManagerResolver;
    private final BearerTokenResolver keycloakBearerTokenResolver;

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .csrfTokenRequestHandler(csrfRequestHandler())
                        .ignoringRequestMatchers(
                                "/actuator/**",
                                "/internal/**"
                        )
                        .requireCsrfProtectionMatcher(SecurityConfig::requiresCsrf)
                )
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(
                            "/actuator/health", 
                            "/actuator/health/**", 
                            "/actuator.info",
                            "/actuator/prometheus"
                        ).permitAll()
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

    private static final Set<String> CSRF_SAFE_METHODS = Set.of("GET", "HEAD", "TRACE", "OPTIONS");
    private static boolean requiresCsrf(HttpServletRequest request) {
        if (CSRF_SAFE_METHODS.contains(request.getMethod())) {
            return false;
        }
        String authHeader = request.getHeader("Authorization");
        return authHeader == null || !authHeader.startsWith("Bearer ");
    }
}
