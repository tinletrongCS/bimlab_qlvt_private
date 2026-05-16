package com.bimlab.asset.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.List;

@Component
public class JwtTokenProvider {
    private static final int MIN_SECRET_LENGTH = 32;
    private static final String ISSUER = "bimlab-auth";
    private final PublicKey rsaPublicKey;
    private final SecretKey hmacKey;
    private final boolean useRsa;

    public JwtTokenProvider(@Value("${app.jwt.secret:}") String secret,
                            @Value("${app.jwt.rsa-public-key:}") String rsa) {
        if (rsa != null && !rsa.isBlank()) {
            this.rsaPublicKey = decodePublicKey(rsa);
            this.hmacKey = null;
            this.useRsa = true;
        } else if (secret != null && secret.length() >= MIN_SECRET_LENGTH && !secret.contains("CHANGE_ME")) {
            this.hmacKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
            this.rsaPublicKey = null;
            this.useRsa = false;
        } else {
            throw new IllegalArgumentException("JWT requires RSA public key or HMAC secret ≥32 chars");
        }
    }

    public String getUsername(String token) { return parse(token).getPayload().getSubject(); }
    public String getRole(String token) { return parse(token).getPayload().get("role", String.class); }
    public String getTokenType(String token) {
        String type = parse(token).getPayload().get("type", String.class);
        return type == null ? "access" : type;
    }

    @SuppressWarnings("unchecked")
    public List<String> getPermissions(String token) {
        Object value = parse(token).getPayload().get("permissions");
        return value instanceof List ? (List<String>) value : List.of();
    }

    public boolean validateToken(String token) {
        try {
            parse(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Jws<Claims> parse(String token) {
        var parser = Jwts.parser().requireIssuer(ISSUER);
        if (useRsa) parser.verifyWith(rsaPublicKey); else parser.verifyWith(hmacKey);
        return parser.build().parseSignedClaims(token);
    }

    private static PublicKey decodePublicKey(String value) {
        try {
            byte[] decoded = Base64.getDecoder().decode(value.replaceAll("\\s+", ""));
            return KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(decoded));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid RSA public key: " + e.getMessage(), e);
        }
    }
}
