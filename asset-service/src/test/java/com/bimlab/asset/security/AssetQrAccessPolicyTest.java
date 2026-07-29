package com.bimlab.asset.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;

class AssetQrAccessPolicyTest {
    private final AssetQrAccessPolicy policy = new AssetQrAccessPolicy(
            "192.168.0.0/16",
            "127.0.0.1/32,172.16.0.0/12"
    );

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void acceptsInternalClientAndIgnoresSpoofedPrefixBeforeRealExternalClient() {
        MockHttpServletRequest internal = new MockHttpServletRequest();
        internal.setRemoteAddr("172.20.0.5");
        internal.addHeader("X-Forwarded-For", "192.168.110.25, 172.20.0.4");
        assertThat(policy.canView(internal)).isTrue();

        MockHttpServletRequest spoofed = new MockHttpServletRequest();
        spoofed.setRemoteAddr("172.20.0.5");
        spoofed.addHeader("X-Forwarded-For", "192.168.1.10, 8.8.8.8, 172.20.0.4");
        assertThat(policy.canView(spoofed)).isFalse();
    }
}
