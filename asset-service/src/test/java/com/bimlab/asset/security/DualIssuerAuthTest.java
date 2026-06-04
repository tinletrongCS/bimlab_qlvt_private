package com.bimlab.asset.security;

import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.PlainJWT;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Phase 1 — đơn vị cho đường dual-issuer: converter (giữ authority legacy),
 * AudienceValidator (nhánh Keycloak), TokenIssuerPeeker (routing decoder).
 */
class DualIssuerAuthTest {

    private static Jwt jwt(Jwt.Builder b) {
        return b.header("alg", "none").build();
    }

    private static Set<String> authStrings(AbstractAuthenticationToken token) {
        return token.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
    }

    // Resolver stub ghi lại có bị gọi không (chứng minh legacy KHÔNG gọi, Keycloak có gọi).
    private static final class RecordingResolver implements com.bimlab.asset.client.RolePermissionResolver {
        int calls = 0;
        final List<String> toReturn;
        RecordingResolver(List<String> toReturn) { this.toReturn = toReturn; }
        @Override public List<String> resolve(String role) { calls++; return toReturn; }
    }

    private static final boolean LEGACY = false;   // resolveFromApi=false
    private static final boolean KEYCLOAK = true;   // resolveFromApi=true

    // ── LEGACY (resolveFromApi=false): dùng claim permissions, KHÔNG gọi resolver ──
    @Test
    void converter_legacy_usesClaim_doesNotCallResolver() {
        RecordingResolver resolver = new RecordingResolver(List.of("SHOULD_NOT_APPEAR"));
        Jwt token = jwt(Jwt.withTokenValue("x")
                .subject("alice")
                .claim("role", "ADMIN")
                .claim("permissions", List.of("asset_manage", "asset_view_all"))
                .claim("employeeId", 42));

        AbstractAuthenticationToken auth = new AssetJwtAuthoritiesConverter(resolver, LEGACY).convert(token);

        assertEquals(Set.of("ROLE_ADMIN", "asset_manage", "asset_view_all"), authStrings(auth));
        assertEquals(0, resolver.calls); // rollback gate: legacy KHÔNG được gọi API
        AssetPrincipal p = (AssetPrincipal) auth.getPrincipal();
        assertEquals("alice", p.username());
        assertEquals(42L, p.employeeId());
    }

    // Legacy với permissions RỖNG ([]) → ROLE only, vẫn KHÔNG gọi resolver (ca cursor nêu).
    @Test
    void converter_legacy_emptyPermissions_usesEmpty_noResolve() {
        RecordingResolver resolver = new RecordingResolver(List.of("SHOULD_NOT_APPEAR"));
        Jwt token = jwt(Jwt.withTokenValue("x").subject("u").claim("role", "EMPLOYEE")
                .claim("permissions", List.of()));
        AbstractAuthenticationToken auth = new AssetJwtAuthoritiesConverter(resolver, LEGACY).convert(token);
        assertEquals(Set.of("ROLE_EMPLOYEE"), authStrings(auth));
        assertEquals(0, resolver.calls);
    }

    // ── KEYCLOAK (resolveFromApi=true): LUÔN resolve role; bỏ qua claim ──
    @Test
    void converter_keycloak_resolvesRole() {
        RecordingResolver resolver = new RecordingResolver(List.of("asset_manage", "asset_view_all"));
        Jwt token = jwt(Jwt.withTokenValue("x").subject("kc").claim("role", "ADMIN").claim("employeeId", 9));

        AbstractAuthenticationToken auth = new AssetJwtAuthoritiesConverter(resolver, KEYCLOAK).convert(token);

        assertEquals(Set.of("ROLE_ADMIN", "asset_manage", "asset_view_all"), authStrings(auth));
        assertEquals(1, resolver.calls);
        assertEquals(9L, ((AssetPrincipal) auth.getPrincipal()).employeeId());
    }

    // Keycloak: username lấy từ preferred_username (sub là UUID/khác) — KHÔNG dùng sub khi có preferred_username.
    @Test
    void converter_keycloak_usernameFromPreferredUsername() {
        RecordingResolver resolver = new RecordingResolver(List.of("asset_view_all"));
        Jwt token = jwt(Jwt.withTokenValue("x")
                .subject("8f3c-uuid-not-username")
                .claim("preferred_username", "admin")
                .claim("role", "ADMIN").claim("employeeId", 1));
        AbstractAuthenticationToken auth = new AssetJwtAuthoritiesConverter(resolver, KEYCLOAK).convert(token);
        assertEquals("admin", ((AssetPrincipal) auth.getPrincipal()).username());
    }

    // Keycloak: thiếu preferred_username → fallback về sub (không null/khác hành vi).
    @Test
    void converter_keycloak_usernameFallsBackToSub_whenNoPreferred() {
        RecordingResolver resolver = new RecordingResolver(List.of());
        Jwt token = jwt(Jwt.withTokenValue("x").subject("kc-sub").claim("role", "HR"));
        AbstractAuthenticationToken auth = new AssetJwtAuthoritiesConverter(resolver, KEYCLOAK).convert(token);
        assertEquals("kc-sub", ((AssetPrincipal) auth.getPrincipal()).username());
    }

    // Defense: token Keycloak có claim permissions (ai thêm mapper tay) → BỎ QUA claim, vẫn resolve.
    @Test
    void converter_keycloak_ignoresStaleClaim_alwaysResolves() {
        RecordingResolver resolver = new RecordingResolver(List.of("asset_view_all"));
        Jwt token = jwt(Jwt.withTokenValue("x").subject("kc").claim("role", "EMPLOYEE")
                .claim("permissions", List.of("asset_manage"))); // claim "lạ" — phải bị bỏ qua
        AbstractAuthenticationToken auth = new AssetJwtAuthoritiesConverter(resolver, KEYCLOAK).convert(token);
        assertEquals(Set.of("ROLE_EMPLOYEE", "asset_view_all"), authStrings(auth)); // dùng resolver, KHÔNG dùng claim
        assertEquals(1, resolver.calls);
    }

    @Test
    void converter_keycloak_employeeIdAsString_resolveEmpty() {
        RecordingResolver resolver = new RecordingResolver(List.of()); // cold-miss/fail-closed → rỗng
        Jwt token = jwt(Jwt.withTokenValue("x").subject("bob").claim("role", "HR").claim("employeeId", "7"));
        AbstractAuthenticationToken auth = new AssetJwtAuthoritiesConverter(resolver, KEYCLOAK).convert(token);
        assertEquals(7L, ((AssetPrincipal) auth.getPrincipal()).employeeId());
        assertEquals(Set.of("ROLE_HR"), authStrings(auth));
    }

    @Test
    void converter_keycloak_noRole_yieldsEmptyAuthorities() {
        RecordingResolver resolver = new RecordingResolver(List.of());
        Jwt token = jwt(Jwt.withTokenValue("x").subject("guest"));
        AbstractAuthenticationToken auth = new AssetJwtAuthoritiesConverter(resolver, KEYCLOAK).convert(token);
        assertEquals(Set.of(), authStrings(auth));
    }

    // ── AudienceValidator: nhánh Keycloak ────────────────────────────────
    @Test
    void audience_pass_whenContainsRequired() {
        Jwt token = jwt(Jwt.withTokenValue("x").subject("a").audience(List.of("asset-service")));
        OAuth2TokenValidatorResult r = new AudienceValidator("asset-service").validate(token);
        assertEquals(false, r.hasErrors());
    }

    @Test
    void audience_fail_whenMissingOrWrong() {
        Jwt token = jwt(Jwt.withTokenValue("x").subject("a").audience(List.of("other-service")));
        OAuth2TokenValidatorResult r = new AudienceValidator("asset-service").validate(token);
        assertEquals(true, r.hasErrors());
    }

    // ── AzpValidator: hardening nhánh Keycloak (allowed client = qlvt) ────
    @Test
    void azp_pass_whenAllowedClient() {
        Jwt token = jwt(Jwt.withTokenValue("x").subject("a").claim("azp", "qlvt"));
        OAuth2TokenValidatorResult r = new AzpValidator(Set.of("qlvt")).validate(token);
        assertEquals(false, r.hasErrors());
    }

    @Test
    void azp_fail_whenOtherClient() {
        Jwt token = jwt(Jwt.withTokenValue("x").subject("a").claim("azp", "some-other-client"));
        OAuth2TokenValidatorResult r = new AzpValidator(Set.of("qlvt")).validate(token);
        assertEquals(true, r.hasErrors());
    }

    @Test
    void azp_disabled_whenEmptySet() {
        Jwt token = jwt(Jwt.withTokenValue("x").subject("a").claim("azp", "some-other-client"));
        OAuth2TokenValidatorResult r = new AzpValidator(Set.of()).validate(token);
        assertEquals(false, r.hasErrors());
    }

    // ── LegacyAccessTokenValidator: chặn refresh token ───────────────────
    @Test
    void legacyValidator_rejectsRefreshToken() {
        Jwt token = jwt(Jwt.withTokenValue("x").subject("a").claim("type", "refresh"));
        assertEquals(true, new LegacyAccessTokenValidator().validate(token).hasErrors());
    }

    @Test
    void legacyValidator_allowsAccessOrAbsentType() {
        Jwt access = jwt(Jwt.withTokenValue("x").subject("a").claim("type", "access"));
        Jwt none = jwt(Jwt.withTokenValue("x").subject("a"));
        assertEquals(false, new LegacyAccessTokenValidator().validate(access).hasErrors());
        assertEquals(false, new LegacyAccessTokenValidator().validate(none).hasErrors());
    }

    // ── TokenIssuerPeeker: routing decoder ───────────────────────────────
    @Test
    void peek_returnsIssuer_forValidJwt() throws Exception {
        String token = new PlainJWT(new JWTClaimsSet.Builder().issuer("bimlab-auth").build()).serialize();
        assertEquals("bimlab-auth", TokenIssuerPeeker.peekIssuer(token));
    }

    @Test
    void peek_returnsNull_forGarbageOrNull() {
        assertEquals(null, TokenIssuerPeeker.peekIssuer("not-a-jwt"));
        assertEquals(null, TokenIssuerPeeker.peekIssuer(null));
    }
}
