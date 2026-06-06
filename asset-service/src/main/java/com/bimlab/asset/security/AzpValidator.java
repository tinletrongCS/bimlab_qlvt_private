package com.bimlab.asset.security;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Set;

/**
 * Hardening (WAVE2-3_PLAN §C.1) — validator riêng cho token Keycloak: kiểm tra claim
 * {@code azp} (authorized party = client phát token) phải nằm trong allowlist client của
 * service. Bổ sung TRÊN aud check: aud xác nhận token DÀNH CHO service này, azp xác nhận
 * token được PHÁT BỞI client được phép (vd asset-service chỉ chấp nhận client {@code qlvt}).
 *
 * <p>Lenient mode: allowlist RỖNG → success (tắt check, không vỡ deploy chưa cấu hình).
 * Chỉ gắn ở decoder Keycloak (xem KeycloakResourceServerConfig.keycloakDecoder()); decoder
 * legacy KHÔNG dùng (token legacy không có azp).
 */
public final class AzpValidator implements OAuth2TokenValidator<Jwt> {

    private final Set<String> allowedClients;

    public AzpValidator(Set<String> allowedClients) {
        this.allowedClients = allowedClients;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        if (allowedClients.isEmpty()) {
            return OAuth2TokenValidatorResult.success();
        }
        String azp = jwt.getClaimAsString("azp");
        if (azp != null && allowedClients.contains(azp)) {
            return OAuth2TokenValidatorResult.success();
        }
        return OAuth2TokenValidatorResult.failure(new OAuth2Error(
                "invalid_token",
                "azp '" + azp + "' not in allowed clients",
                null));
    }
}
