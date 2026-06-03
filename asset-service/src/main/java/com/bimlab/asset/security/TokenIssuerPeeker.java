package com.bimlab.asset.security;

import com.nimbusds.jwt.JWTParser;

/**
 * Phase 1 — đọc claim {@code iss} của JWT mà KHÔNG verify chữ ký, chỉ để CHỌN
 * decoder đúng issuer (legacy vs Keycloak). Việc verify thật do decoder tương ứng
 * thực hiện sau đó. Không tin bất kỳ claim nào ở bước này ngoài việc routing.
 */
public final class TokenIssuerPeeker {

    private TokenIssuerPeeker() {
    }

    /** Trả về issuer (claim iss) hoặc null nếu token rỗng/không parse được. */
    public static String peekIssuer(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            Object iss = JWTParser.parse(token).getJWTClaimsSet().getIssuer();
            return iss == null ? null : iss.toString();
        } catch (Exception e) {
            return null;
        }
    }
}
