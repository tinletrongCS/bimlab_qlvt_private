package com.bimlab.asset.config;

import com.bimlab.asset.client.RolePermissionResolver;
import com.bimlab.asset.security.AssetJwtAuthoritiesConverter;
import com.bimlab.asset.security.AudienceValidator;
import com.bimlab.asset.security.AzpValidator;
import com.bimlab.asset.security.CookieBearerTokenResolver;
import com.bimlab.asset.security.TokenIssuerPeeker;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationManagerResolver;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationProvider;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.time.Duration;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * Phase 1 (Keycloak SSO) — chỉ kích hoạt khi {@code auth.keycloak.enabled=true}.
 * Dựng đường resource-server DUAL-ISSUER an toàn:
 *
 * <ul>
 *   <li><b>Decoder-per-issuer</b>: đọc {@code iss} (chưa verify) để CHỌN decoder, rồi
 *       decoder tương ứng verify thật.</li>
 *   <li><b>Legacy</b> ({@code bimlab-auth}): pin MAC/HS512 (hoặc RS256 nếu cấu hình
 *       RSA public key) — KHÔNG dùng JWKS, KHÔNG validate aud (token cũ không có aud).</li>
 *   <li><b>Keycloak</b>: pin RS256, verify qua {@code jwk-set-uri} (KHÔNG issuer-uri
 *       discovery → service start được khi Keycloak down), validate issuer + aud.</li>
 *   <li><b>Chống algorithm-confusion</b>: decoder legacy không có public key (chỉ MAC),
 *       decoder Keycloak không có secret (chỉ RS256/JWKS) → không thể tráo thuật toán.</li>
 * </ul>
 *
 * Khi flag tắt (mặc định) bean này KHÔNG tồn tại và SecurityConfig giữ nguyên
 * {@code JwtAuthenticationFilter} cũ (rollback an toàn).
 */
@Configuration
@ConditionalOnProperty(name = "auth.keycloak.enabled", havingValue = "true")
public class KeycloakResourceServerConfig {

    private static final Logger log = Logger.getLogger(KeycloakResourceServerConfig.class.getName());

    @Value("${app.jwt.secret:}")
    private String legacySecret;
    @Value("${app.jwt.rsa-public-key:}")
    private String legacyRsaPublicKey;
    @Value("${auth.legacy.issuer:bimlab-auth}")
    private String legacyIssuer;
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
     * Chọn AuthenticationManager theo issuer của token. Token không thuộc issuer nào
     * trong allowlist → reject (InvalidBearerTokenException → 401).
     */
    @Bean
    AuthenticationManagerResolver<HttpServletRequest> dualIssuerAuthenticationManagerResolver(
            BearerTokenResolver bearerTokenResolver,
            RolePermissionResolver rolePermissionResolver) {
        // 2 converter riêng theo issuer: legacy dùng claim (không gọi API); Keycloak luôn resolve role.
        AuthenticationManager legacyManager = managerFor(legacyDecoder(),
                new AssetJwtAuthoritiesConverter(rolePermissionResolver, false));
        AuthenticationManager keycloakManager = managerFor(keycloakDecoder(),
                new AssetJwtAuthoritiesConverter(rolePermissionResolver, true));
        AuthenticationManager rejectManager = authentication -> {
            throw new InvalidBearerTokenException("Unknown or untrusted token issuer");
        };

        return request -> {
            String token = bearerTokenResolver.resolve(request);
            String issuer = TokenIssuerPeeker.peekIssuer(token);
            if (legacyIssuer.equals(issuer)) {
                return legacyManager;
            }
            if (keycloakIssuer != null && !keycloakIssuer.isBlank() && keycloakIssuer.equals(issuer)) {
                return keycloakManager;
            }
            return rejectManager;
        };
    }

    private AuthenticationManager managerFor(JwtDecoder decoder, AssetJwtAuthoritiesConverter converter) {
        JwtAuthenticationProvider provider = new JwtAuthenticationProvider(decoder);
        provider.setJwtAuthenticationConverter(converter);
        return new ProviderManager(provider);
    }

    /** Legacy issuer: MAC (HS256/384/512 derive theo độ dài secret) hoặc RS256 nếu có RSA public key. KHÔNG validate aud. */
    private JwtDecoder legacyDecoder() {
        NimbusJwtDecoder decoder;
        if (legacyRsaPublicKey != null && !legacyRsaPublicKey.isBlank()) {
            decoder = NimbusJwtDecoder.withPublicKey(decodeRsaPublicKey(legacyRsaPublicKey))
                    .signatureAlgorithm(SignatureAlgorithm.RS256)
                    .build();
        } else {
            // auth-service (jjwt Keys.hmacShaKeyFor) tự chọn HS theo độ dài key. Mirror đúng
            // logic đó để pin 1 HS variant khớp token thật (chống HS-variant confusion); KHÔNG
            // cấu hình public key cho decoder này nên không thể tráo sang RS (chống RS↔HS confusion).
            byte[] keyBytes = legacySecret.getBytes(StandardCharsets.UTF_8);
            int bits = keyBytes.length * 8;
            MacAlgorithm macAlgorithm;
            String jcaName;
            if (bits >= 512) {
                macAlgorithm = MacAlgorithm.HS512;
                jcaName = "HmacSHA512";
            } else if (bits >= 384) {
                macAlgorithm = MacAlgorithm.HS384;
                jcaName = "HmacSHA384";
            } else if (bits >= 256) {
                macAlgorithm = MacAlgorithm.HS256;
                jcaName = "HmacSHA256";
            } else {
                throw new IllegalStateException(
                        "Legacy JWT secret too short: " + bits + " bits (min 256 for HMAC-SHA)");
            }
            log.info("Legacy JWT MAC algorithm derived from secret length: " + macAlgorithm.getName());
            SecretKey key = new SecretKeySpec(keyBytes, jcaName);
            decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(macAlgorithm).build();
        }
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                new JwtTimestampValidator(Duration.ofSeconds(clockSkewSeconds)),
                new JwtIssuerValidator(legacyIssuer),
                // Chặn refresh token legacy dùng làm access token (như JwtAuthenticationFilter cũ).
                new com.bimlab.asset.security.LegacyAccessTokenValidator()));
        return decoder;
    }

    /** Keycloak issuer: RS256 qua JWKS. Validate issuer + aud=asset-service. */
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

    private static RSAPublicKey decodeRsaPublicKey(String value) {
        try {
            byte[] decoded = Base64.getDecoder().decode(value.replaceAll("\\s+", ""));
            return (RSAPublicKey) KeyFactory.getInstance("RSA")
                    .generatePublic(new X509EncodedKeySpec(decoded));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid RSA public key: " + e.getMessage(), e);
        }
    }
}
