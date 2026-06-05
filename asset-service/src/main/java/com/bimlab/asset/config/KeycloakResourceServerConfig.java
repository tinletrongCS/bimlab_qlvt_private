package com.bimlab.asset.config;

import com.bimlab.asset.client.RolePermissionResolver;
import com.bimlab.asset.security.AssetJwtAuthoritiesConverter;
import com.bimlab.asset.security.AudienceValidator;
import com.bimlab.asset.security.AzpValidator;
import com.bimlab.asset.security.CookieBearerTokenResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationManagerResolver;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationProvider;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;

import java.time.Duration;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Keycloak SSO — resource-server KEYCLOAK-ONLY:
 *
 * <ul>
 *   <li><b>Keycloak</b>: pin RS256, verify qua {@code jwk-set-uri} (KHÔNG issuer-uri
 *       discovery → service start được khi Keycloak down), validate issuer + aud + azp.</li>
 *   <li>Token được resolve qua {@link CookieBearerTokenResolver} (cookie {@code jwt} hoặc
 *       header {@code Authorization: Bearer}).</li>
 * </ul>
 */
@Configuration
public class KeycloakResourceServerConfig {

    @Value("${auth.keycloak.issuer:}")
    private String keycloakIssuer;
    @Value("${auth.keycloak.jwk-set-uri:}")
    private String keycloakJwkSetUri;
    @Value("${auth.keycloak.audience:asset-service}")
    private String keycloakAudience;
    @Value("${auth.keycloak.allowed-clients:qlvt}")
    private String allowedClientsCsv;
    @Value("${auth.keycloak.clock-skew-seconds:30}")
    private long clockSkewSeconds;

    @Bean
    BearerTokenResolver cookieBearerTokenResolver() {
        return new CookieBearerTokenResolver();
    }

    /**
     * Resolver KC-only: mọi request dùng cùng một {@link AuthenticationManager} pin RS256/JWKS,
     * validate issuer + aud + azp. Token không hợp lệ → {@code JwtAuthenticationProvider} ném
     * {@code InvalidBearerTokenException} → 401.
     */
    @Bean
    AuthenticationManagerResolver<HttpServletRequest> keycloakAuthenticationManagerResolver(
            RolePermissionResolver rolePermissionResolver) {
        AuthenticationManager keycloakManager = managerFor(keycloakDecoder(),
                new AssetJwtAuthoritiesConverter(rolePermissionResolver, true));
        return request -> keycloakManager;
    }

    private AuthenticationManager managerFor(JwtDecoder decoder, AssetJwtAuthoritiesConverter converter) {
        JwtAuthenticationProvider provider = new JwtAuthenticationProvider(decoder);
        provider.setJwtAuthenticationConverter(converter);
        return new ProviderManager(provider);
    }

    /** Keycloak issuer: RS256 qua JWKS. Validate issuer + aud=asset-service + azp. */
    private JwtDecoder keycloakDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(keycloakJwkSetUri)
                .jwsAlgorithm(SignatureAlgorithm.RS256)
                .build();
        OAuth2TokenValidator<Jwt> validators = new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(Duration.ofSeconds(clockSkewSeconds)),
                new JwtIssuerValidator(keycloakIssuer),
                new AudienceValidator(keycloakAudience),
                new AzpValidator(parseAllowedClients(allowedClientsCsv)));
        decoder.setJwtValidator(validators);
        return decoder;
    }

    /** CSV → Set client cho azp allowlist (trim, bỏ phần tử rỗng). CSV rỗng → Set rỗng (lenient/tắt check). */
    private static Set<String> parseAllowedClients(String csv) {
        if (csv == null || csv.isBlank()) {
            return Set.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
