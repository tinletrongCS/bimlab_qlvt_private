package com.bimlab.asset.security;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Validator token Keycloak: bắt buộc claim {@code aud} chứa
 * audience của service (mặc định {@code asset-service}). Token legacy KHÔNG có
 * {@code aud} nên KHÔNG dùng validator này (xem KeycloakResourceServerConfig:
 * decoder legacy không gắn AudienceValidator). Ngăn token phát cho client/app
 * khác dùng được trên asset-service.
 */
public final class AudienceValidator implements OAuth2TokenValidator<Jwt> {

    private final String requiredAudience;

    public AudienceValidator(String requiredAudience) {
        this.requiredAudience = requiredAudience;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        if (jwt.getAudience() != null && jwt.getAudience().contains(requiredAudience)) {
            return OAuth2TokenValidatorResult.success();
        }
        return OAuth2TokenValidatorResult.failure(new OAuth2Error(
                "invalid_token",
                "Required audience '" + requiredAudience + "' is missing",
                null));
    }
}
