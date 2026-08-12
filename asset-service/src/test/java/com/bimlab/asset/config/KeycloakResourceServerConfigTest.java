package com.bimlab.asset.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/**
 * SEC-QLTS-ISSUER-FAILCLOSED — issuer LUÔN được validate, khớp pattern HRM/CDS
 * ({@code InternalServiceTokenAuthenticator}). Ưu tiên issuer tường minh; rỗng thì derive
 * từ jwk-set-uri dạng Keycloak; không resolve được → fail-closed (thay vì {@code JwtIssuerValidator("")}
 * vốn từ chối mọi token → 401 hàng loạt).
 */
class KeycloakResourceServerConfigTest {

    @Test
    void deriveIssuer_fromKeycloakJwks() {
        assertThat(KeycloakResourceServerConfig.deriveIssuer(
                "http://kc:8080/realms/bimlab/protocol/openid-connect/certs"))
                .isEqualTo("http://kc:8080/realms/bimlab");
    }

    @Test
    void deriveIssuer_nonKeycloakUri_null() {
        assertThat(KeycloakResourceServerConfig.deriveIssuer("http://x/certs")).isNull();
        assertThat(KeycloakResourceServerConfig.deriveIssuer(null)).isNull();
    }

    @Test
    void resolveIssuer_explicitIssuerWins() {
        assertThat(KeycloakResourceServerConfig.resolveIssuer(
                "https://sso.bimlab.com.vn/realms/bimlab",
                "http://kc:8080/realms/bimlab/protocol/openid-connect/certs"))
                .isEqualTo("https://sso.bimlab.com.vn/realms/bimlab");
    }

    @Test
    void resolveIssuer_blankIssuer_derivesFromJwks() {
        assertThat(KeycloakResourceServerConfig.resolveIssuer(
                "  ", "http://kc:8080/realms/bimlab/protocol/openid-connect/certs"))
                .isEqualTo("http://kc:8080/realms/bimlab");
    }

    @Test
    void resolveIssuer_blankIssuerAndNonDerivableJwks_throwsFailClosed() {
        assertThatThrownBy(() -> KeycloakResourceServerConfig.resolveIssuer("", "http://kc/certs"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("issuer");
    }

    @Test
    void resolveIssuer_blankIssuerAndBlankJwks_throwsFailClosed() {
        assertThatThrownBy(() -> KeycloakResourceServerConfig.resolveIssuer("", ""))
                .isInstanceOf(IllegalStateException.class);
    }
}
