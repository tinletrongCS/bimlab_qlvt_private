package com.bimlab.asset.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Logger;

/**
 * PA-B (Keycloak SSO): resolve role→permissions qua auth-service internal API
 * {@code GET /internal/roles/{role}/permissions}. Có cache TTL ngắn + serve-stale.
 *
 * <ul>
 *   <li><b>Cache hit (còn hạn):</b> trả ngay, không gọi API.</li>
 *   <li><b>Miss / hết hạn:</b> gọi API; thành công → cập nhật cache + trả.</li>
 *   <li><b>Auth-service lỗi/timeout + đã có cache (kể cả hết hạn):</b> SERVE-STALE — trả giá trị
 *       cache last-known (tránh "auth chập chờn là mất quyền").</li>
 *   <li><b>Cold-miss (chưa từng cache role đó + auth lỗi):</b> trả rỗng → converter chỉ cấp
 *       {@code ROLE_<role>} → 403 ở endpoint cần permission (fail-closed an toàn).</li>
 * </ul>
 */
@Component
public class RolePermissionClient implements RolePermissionResolver {

    private static final Logger log = Logger.getLogger(RolePermissionClient.class.getName());
    private static final long TTL_MILLIS = 60_000L;

    private final RestTemplate restTemplate;
    private final String authServiceUrl;
    private final String internalApiKey;
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    public RolePermissionClient(
            RestTemplate restTemplate,
            @Value("${app.auth-service.url:http://localhost:8081}") String authServiceUrl,
            @Value("${app.internal-api-key:}") String internalApiKey) {
        this.restTemplate = restTemplate;
        this.authServiceUrl = authServiceUrl;
        this.internalApiKey = internalApiKey;
    }

    @Override
    public List<String> resolve(String role) {
        if (role == null || role.isBlank()) {
            return List.of();
        }
        Cached cached = cache.get(role);
        if (cached != null && !cached.isExpired()) {
            return cached.permissions;
        }
        try {
            List<String> fresh = fetch(role);
            cache.put(role, new Cached(fresh, now()));
            return fresh;
        } catch (RuntimeException e) {
            if (cached != null) {
                // serve-stale: dùng cache last-known dù đã hết TTL.
                log.warning("auth-service resolve role '" + role + "' lỗi (" + e.getMessage()
                        + ") → serve-stale từ cache");
                return cached.permissions;
            }
            // cold-miss: fail-closed (rỗng → chỉ ROLE_<role>).
            log.warning("auth-service resolve role '" + role + "' lỗi (" + e.getMessage()
                    + ") + chưa có cache → fail-closed (rỗng)");
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> fetch(String role) {
        String url = UriComponentsBuilder
                .fromHttpUrl(authServiceUrl)
                .path("/internal/roles/{role}/permissions")
                .buildAndExpand(role)
                .encode()
                .toUriString();
        HttpHeaders headers = new HttpHeaders();
        if (!internalApiKey.isBlank()) {
            headers.set("X-Internal-Key", internalApiKey);
        }
        ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
        Object perms = resp.getBody() == null ? null : resp.getBody().get("permissions");
        if (perms instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        return List.of();
    }

    // Cho phép test override thời gian; mặc định System.currentTimeMillis.
    long now() {
        return System.currentTimeMillis();
    }

    private final class Cached {
        final List<String> permissions;
        final long storedAt;

        Cached(List<String> permissions, long storedAt) {
            this.permissions = permissions;
            this.storedAt = storedAt;
        }

        boolean isExpired() {
            return now() - storedAt > TTL_MILLIS;
        }
    }
}
