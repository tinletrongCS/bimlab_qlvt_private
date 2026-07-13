package com.bimlab.asset.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Logger;

/**
 * PA-B (Keycloak SSO): resolve role→permissions qua auth-service internal API
 * {@code GET /internal/roles/{role}/permissions}. Cache TTL ngắn + serve-stale + warm-up.
 *
 * <ul>
 *   <li><b>Cache hit (còn hạn):</b> trả ngay, không gọi API.</li>
 *   <li><b>Miss / hết hạn:</b> gọi API; thành công (có quyền) → cập nhật cache + trả.
 *       KHÔNG cache kết quả rỗng — tránh đầu độc cache bằng response transient/partial.</li>
 *   <li><b>Auth-service lỗi/timeout + đã có cache (kể cả hết hạn):</b> SERVE-STALE — trả cache last-known.</li>
 *   <li><b>Cold-miss (chưa từng cache + auth lỗi):</b> RETRY ngắn (300/700ms) rồi mới fail-closed
 *       (rỗng → converter chỉ cấp {@code ROLE_<role>} → 403). Sự cố 2026-07-06: deploy HRM làm
 *       auth-service chớp tắt → user cold-cache bị 403 oan dù role có quyền.</li>
 *   <li><b>Warm-up:</b> thread nền prefetch các role hệ thống ngay khi app sẵn sàng (retry tới
 *       ~5 phút) → sau (re)deploy cache luôn ấm, auth-service chớp tắt chỉ còn serve-stale.</li>
 * </ul>
 */
@Component
public class RolePermissionClient implements RolePermissionResolver {

    private static final Logger log = Logger.getLogger(RolePermissionClient.class.getName());
    private static final long TTL_MILLIS = 60_000L;
    /** Delay giữa các lần retry khi cold-miss gặp lỗi — tổng ~1s, đủ cứu blip restart ngắn. */
    private static final long[] COLD_MISS_RETRY_DELAYS_MS = {300L, 700L};
    private static final long COLD_MISS_RETRY_DEADLINE_MS = 3_000L;
    /** Role hệ thống (khớp User.Role của auth-service) — warm-up best-effort; role lạ vẫn có retry + serve-stale. */
    private static final List<String> WARMUP_ROLES =
            List.of("ADMIN", "HR", "CEO", "TEAM_LEAD", "EMPLOYEE", "INTERN", "FINANCE");
    private static final int WARMUP_MAX_ROUNDS = 20;
    private static final long WARMUP_ROUND_DELAY_MS = 15_000L;

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
        long startedAt = now();
        try {
            return cacheAndReturn(role, fetch(role));
        } catch (RuntimeException e) {
            if (cached != null) {
                // serve-stale: dùng cache last-known dù đã hết TTL.
                log.warning("auth-service resolve role '" + role + "' lỗi (" + e.getMessage()
                        + ") → serve-stale từ cache");
                return cached.permissions;
            }
            // Cold-miss: retry ngắn trước khi fail-closed — blip auth-service (restart/deploy) tự lành.
            for (long delayMs : COLD_MISS_RETRY_DELAYS_MS) {
                if (now() - startedAt > COLD_MISS_RETRY_DEADLINE_MS || !sleepQuietly(delayMs)) {
                    break;
                }
                try {
                    List<String> fresh = cacheAndReturn(role, fetch(role));
                    log.info("auth-service resolve role '" + role + "' OK sau retry");
                    return fresh;
                } catch (RuntimeException retryError) {
                    e = retryError;
                }
            }
            // cold-miss: fail-closed (rỗng → chỉ ROLE_<role>).
            log.warning("auth-service resolve role '" + role + "' lỗi (" + e.getMessage()
                    + ") + chưa có cache (đã retry " + COLD_MISS_RETRY_DELAYS_MS.length
                    + " lần) → fail-closed (rỗng)");
            return List.of();
        }
    }

    private List<String> cacheAndReturn(String role, List<String> fresh) {
        if (fresh.isEmpty()) {
            cache.remove(role);
        } else {
            cache.put(role, new Cached(fresh, now()));
        }
        return fresh;
    }

    /**
     * Prefetch quyền các role hệ thống sau khi app sẵn sàng — đóng cửa sổ cold-miss sau (re)deploy.
     * Best-effort trên thread daemon: auth-service chưa lên thì thử lại mỗi 15s (tối đa ~5 phút);
     * thất bại chỉ log, không ảnh hưởng khởi động.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void warmUpCacheAsync() {
        Thread thread = new Thread(this::warmUpCache, "role-permission-warmup");
        thread.setDaemon(true);
        thread.start();
    }

    void warmUpCache() {
        Set<String> pending = new LinkedHashSet<>(WARMUP_ROLES);
        for (int round = 1; round <= WARMUP_MAX_ROUNDS && !pending.isEmpty(); round++) {
            if (round > 1 && !sleepQuietly(WARMUP_ROUND_DELAY_MS)) {
                return;
            }
            pending.removeIf(role -> {
                try {
                    List<String> perms = fetch(role);
                    if (perms.isEmpty()) {
                        return false;
                    }
                    cache.put(role, new Cached(perms, now()));
                    return true;
                } catch (RuntimeException e) {
                    return false; // auth-service chưa sẵn sàng → thử lại vòng sau
                }
            });
        }
        if (pending.isEmpty()) {
            log.info("Warm-up role→permissions xong cho " + WARMUP_ROLES.size() + " role hệ thống");
        } else {
            log.warning("Warm-up role→permissions chưa trọn: còn thiếu " + pending
                    + " — request thật vẫn có retry + serve-stale");
        }
    }

    boolean sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
            return true;
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return false;
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
        // Response sai hình dạng (thiếu 'permissions') → coi là LỖI, ném để vào nhánh serve-stale/
        // cold-miss thay vì trả rỗng âm thầm rồi bị cache như thành công.
        throw new IllegalStateException("auth-service response thiếu 'permissions' (role=" + role + ")");
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
