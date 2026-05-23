package com.bimlab.asset.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtTokenProvider tokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = resolve(request);
        if (token != null && tokenProvider.validateToken(token) && !"refresh".equals(tokenProvider.getTokenType(token))) {
            String username = tokenProvider.getUsername(token);
            String role = tokenProvider.getRole(token);
            List<String> permissions = tokenProvider.getPermissions(token);
            Long employeeId = tokenProvider.getEmployeeId(token); // F1: carry into principal
            List<org.springframework.security.core.GrantedAuthority> authorities = new ArrayList<>();
            if (role != null && !role.isBlank()) authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
            permissions.forEach(permission -> authorities.add(new SimpleGrantedAuthority(permission)));
            AssetPrincipal principal = new AssetPrincipal(username, employeeId);
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(principal, null, authorities));
        }
        chain.doFilter(request, response);
    }

    private String resolve(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("jwt".equals(cookie.getName())) return cookie.getValue();
            }
        }
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) return header.substring(7);
        return null;
    }
}
