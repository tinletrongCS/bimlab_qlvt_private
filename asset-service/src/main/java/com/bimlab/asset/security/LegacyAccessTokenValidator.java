package com.bimlab.asset.security;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Phase 1 — chặn refresh token legacy bị dùng như access token trên đường dual-issuer.
 *
 * <p>Token legacy mang claim {@code type} ("access" / "refresh"); {@link JwtAuthenticationFilter}
 * cũ bỏ qua token {@code type=refresh}. Đường resource-server mới phải tái hiện ràng buộc này:
 * refresh token có cùng issuer/secret nên sẽ qua bước verify chữ ký — validator này từ chối
 * nó ở tầng validate (→ 401) trước khi sinh authentication. Token Keycloak không có claim
 * {@code type} nên validator chỉ gắn vào decoder legacy.
 */
public final class LegacyAccessTokenValidator implements OAuth2TokenValidator<Jwt> {

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        String type = jwt.getClaimAsString("type");
        if ("refresh".equals(type)) {
            return OAuth2TokenValidatorResult.failure(new OAuth2Error(
                    "invalid_token",
                    "Refresh token is not accepted as an access token",
                    null));
        }
        return OAuth2TokenValidatorResult.success();
    }
}
