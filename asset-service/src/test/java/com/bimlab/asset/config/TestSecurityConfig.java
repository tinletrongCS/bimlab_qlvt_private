package com.bimlab.asset.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Q8: minimal security config for @WebMvcTest slices.
 *
 * <p>The production {@link SecurityConfig} pulls in {@code JwtAuthenticationFilter}
 * which requires the auth-service URL + JWT secret env vars — those aren't
 * available in unit-test context. This shim enables {@code @EnableMethodSecurity}
 * (so {@code @PreAuthorize} actually fires) but skips the JWT chain entirely,
 * letting {@code @WithMockUser} drive authentication in tests.
 */
// @TestConfiguration is opt-in via @Import — prevents Spring Boot's
// component-scan from picking this up in unrelated @SpringBootTest contexts
// (e.g. MethodSecurityBootSmokeTest with webEnvironment=NONE has no
// HttpSecurity bean and would fail to autowire this @Bean).
@TestConfiguration
@EnableMethodSecurity
public class TestSecurityConfig {

    @Bean
    SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().authenticated());
        return http.build();
    }
}
