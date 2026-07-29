package com.bimlab.asset.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Component
public class AssetQrAccessPolicy {
    private final List<IpAddressMatcher> internalNetworks;
    private final List<IpAddressMatcher> trustedProxies;

    public AssetQrAccessPolicy(
            @Value("${asset.qr.internal-cidrs:127.0.0.1/32,::1/128}") String internalCidrs,
            @Value("${asset.qr.trusted-proxy-cidrs:127.0.0.1/32,::1/128,172.16.0.0/12}") String trustedProxyCidrs
    ) {
        this.internalNetworks = parseMatchers(internalCidrs);
        this.trustedProxies = parseMatchers(trustedProxyCidrs);
    }

    public boolean canView(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {
            return true;
        }
        String clientIp = resolveClientIp(request);
        return internalNetworks.stream().anyMatch(network -> matches(network, clientIp));
    }

    String resolveClientIp(HttpServletRequest request) {
        List<String> chain = new ArrayList<>();
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null) {
            Arrays.stream(forwardedFor.split(","))
                    .map(String::trim)
                    .filter(value -> !value.isEmpty())
                    .forEach(chain::add);
        }
        chain.add(request.getRemoteAddr());

        for (int index = chain.size() - 1; index >= 0; index--) {
            String address = chain.get(index);
            boolean trusted = trustedProxies.stream().anyMatch(proxy -> matches(proxy, address));
            if (!trusted) {
                return address;
            }
        }
        return chain.get(0);
    }

    private static List<IpAddressMatcher> parseMatchers(String cidrs) {
        if (cidrs == null || cidrs.isBlank()) {
            return List.of();
        }
        return Arrays.stream(cidrs.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(IpAddressMatcher::new)
                .toList();
    }

    private static boolean matches(IpAddressMatcher matcher, String address) {
        try {
            return matcher.matches(address);
        } catch (IllegalArgumentException ignored) {
            return false;
        }
    }
}
