package com.bimlab.asset.config;

import com.bimlab.asset.client.RolePermissionResolver;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.PlainJWT;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationManagerResolver;
import org.springframework.security.authentication.ProviderNotFoundException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;

import java.lang.reflect.Field;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Phase 4.3d (L3) — kill-switch {@code auth.keycloak.accept-legacy-token}.
 *
 * <p>Khẳng định hành vi định tuyến của {@code dualIssuerAuthenticationManagerResolver}:
 * <ul>
 *   <li>accept-legacy-token=false ⇒ token legacy-issuer (bimlab-auth) bị reject (401) thay vì decode.</li>
 *   <li>accept-legacy-token=true  ⇒ token legacy-issuer vẫn về legacyManager (hành vi dual-issuer cũ).</li>
 *   <li>Token Keycloak LUÔN về keycloakManager (cờ chỉ ảnh hưởng legacy, không khoá KC khi cutover).</li>
 *   <li>Issuer lạ ⇒ reject ở cả 2 chế độ.</li>
 * </ul>
 *
 * <p>Phân biệt 2 nhánh KHÔNG cần token thật: rejectManager là lambda ném
 * {@link InvalidBearerTokenException} cho MỌI input; còn legacy/keycloakManager là
 * {@code ProviderManager} → với một auth-token không được hỗ trợ nó ném
 * {@link ProviderNotFoundException}. Hai exception khác nhau ⇒ biết được nhánh nào.
 */
class LegacyTokenCutoffTest {

    private static final String LEGACY_ISSUER = "bimlab-auth";
    private static final String KC_ISSUER = "http://keycloak:8080/realms/bimlab";

    private static String tokenWithIssuer(String issuer) throws Exception {
        return new PlainJWT(new JWTClaimsSet.Builder().issuer(issuer).build()).serialize();
    }

    private static void setField(Object target, String name, Object value) throws Exception {
        Field f = target.getClass().getDeclaredField(name);
        f.setAccessible(true);
        f.set(target, value);
    }

    /** Dựng resolver với cờ acceptLegacyToken cho trước; bearer-resolver luôn trả {@code token}. */
    private static AuthenticationManagerResolver<HttpServletRequest> resolverFor(
            boolean acceptLegacyToken, String token) throws Exception {
        KeycloakResourceServerConfig config = new KeycloakResourceServerConfig();
        setField(config, "legacySecret", "x".repeat(64));   // ≥512 bit ⇒ HS512, decoder dựng được
        setField(config, "legacyRsaPublicKey", "");
        setField(config, "legacyIssuer", LEGACY_ISSUER);
        setField(config, "keycloakIssuer", KC_ISSUER);
        setField(config, "keycloakJwkSetUri", KC_ISSUER + "/protocol/openid-connect/certs");
        setField(config, "keycloakAudience", "asset-service");
        setField(config, "allowedClientsCsv", "qlvt");
        setField(config, "clockSkewSeconds", 30L);
        setField(config, "acceptLegacyToken", acceptLegacyToken);

        BearerTokenResolver bearer = (HttpServletRequest req) -> token;
        RolePermissionResolver roles = role -> List.of();
        return config.dualIssuerAuthenticationManagerResolver(bearer, roles);
    }

    private static AuthenticationManager manage(boolean acceptLegacy, String token) throws Exception {
        return resolverFor(acceptLegacy, token).resolve(null);
    }

    private static final TestingAuthenticationToken ANY_AUTH = new TestingAuthenticationToken("u", "p");

    @Test
    void legacyToken_rejected_whenAcceptLegacyFalse() throws Exception {
        AuthenticationManager mgr = manage(false, tokenWithIssuer(LEGACY_ISSUER));
        // rejectManager ⇒ InvalidBearerTokenException cho mọi input (không hề chạm token).
        assertThrows(InvalidBearerTokenException.class, () -> mgr.authenticate(ANY_AUTH));
    }

    @Test
    void legacyToken_routedToLegacyManager_whenAcceptLegacyTrue() throws Exception {
        AuthenticationManager mgr = manage(true, tokenWithIssuer(LEGACY_ISSUER));
        // legacyManager là ProviderManager ⇒ auth-token không hỗ trợ ⇒ ProviderNotFoundException (KHÔNG phải reject).
        assertThrows(ProviderNotFoundException.class, () -> mgr.authenticate(ANY_AUTH));
    }

    @Test
    void keycloakToken_routedToKeycloak_evenWhenAcceptLegacyFalse() throws Exception {
        AuthenticationManager mgr = manage(false, tokenWithIssuer(KC_ISSUER));
        // Cờ chỉ chặn legacy; token KC vẫn về keycloakManager (ProviderManager).
        assertThrows(ProviderNotFoundException.class, () -> mgr.authenticate(ANY_AUTH));
    }

    @Test
    void unknownIssuer_rejected_inBothModes() throws Exception {
        assertThrows(InvalidBearerTokenException.class,
                () -> manage(true, tokenWithIssuer("evil-issuer")).authenticate(ANY_AUTH));
        assertThrows(InvalidBearerTokenException.class,
                () -> manage(false, tokenWithIssuer("evil-issuer")).authenticate(ANY_AUTH));
    }
}
