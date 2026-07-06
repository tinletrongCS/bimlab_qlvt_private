package com.bimlab.asset.client;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * PA-B (Keycloak SSO) — cache TTL + serve-stale + cold-miss của RolePermissionClient.
 */
class RolePermissionClientTest {

    private final RestTemplate rt = mock(RestTemplate.class);
    private final long[] clock = {1_000L};

    private RolePermissionClient client() {
        return new RolePermissionClient(rt, "http://auth-service:8081", "k") {
            @Override
            long now() {
                return clock[0];
            }

            @Override
            boolean sleepQuietly(long millis) {
                clock[0] += millis;
                return true;
            }
        };
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void stubOk(List<String> perms) {
        when(rt.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn((ResponseEntity) ResponseEntity.ok(Map.of("role", "ADMIN", "permissions", perms)));
    }

    @Test
    void cacheHit_withinTtl_callsApiOnce() {
        stubOk(List.of("asset_manage"));
        RolePermissionClient c = client();
        assertEquals(List.of("asset_manage"), c.resolve("ADMIN"));
        assertEquals(List.of("asset_manage"), c.resolve("ADMIN")); // còn hạn → không gọi lại
        verify(rt, times(1)).exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class));
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void serveStale_whenAuthErrorsAfterExpiry() {
        when(rt.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn((ResponseEntity) ResponseEntity.ok(Map.of("permissions", List.of("asset_manage"))))
                .thenThrow(new RestClientException("auth down"));
        RolePermissionClient c = client();
        assertEquals(List.of("asset_manage"), c.resolve("ADMIN")); // cache
        clock[0] += 70_000L; // hết TTL → lần sau sẽ fetch lại
        assertEquals(List.of("asset_manage"), c.resolve("ADMIN")); // auth lỗi → serve-stale
    }

    @Test
    void coldMiss_whenAuthErrorsNoCache_returnsEmpty() {
        when(rt.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenThrow(new RestClientException("auth down"));
        assertEquals(List.of(), client().resolve("NEVER_CACHED")); // fail-closed (sau khi retry hết)
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void coldMiss_retryCuuBlipAuthService() {
        // Lần đầu lỗi (auth-service đang restart), retry lần 1 thành công → có quyền, không 403 oan.
        when(rt.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenThrow(new RestClientException("auth restarting"))
                .thenReturn((ResponseEntity) ResponseEntity.ok(Map.of("permissions", List.of("asset_manage"))));
        RolePermissionClient c = client();
        assertEquals(List.of("asset_manage"), c.resolve("ADMIN"));
        verify(rt, times(2)).exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class));
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void authoritativeEmpty_evictsStalePermissions() {
        when(rt.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn((ResponseEntity) ResponseEntity.ok(Map.of("permissions", List.of("asset_manage"))))
                .thenReturn((ResponseEntity) ResponseEntity.ok(Map.of("permissions", List.of())))
                .thenThrow(new RestClientException("auth down"));
        RolePermissionClient c = client();
        assertEquals(List.of("asset_manage"), c.resolve("CUSTOM"));
        clock[0] += 70_000L;
        assertEquals(List.of(), c.resolve("CUSTOM"));
        assertEquals(List.of(), c.resolve("CUSTOM"));
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void malformedResponse_servesExpiredStaleCache() {
        when(rt.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn((ResponseEntity) ResponseEntity.ok(Map.of("permissions", List.of("asset_manage"))))
                .thenReturn((ResponseEntity) ResponseEntity.ok(Map.of("role", "ADMIN")));
        RolePermissionClient c = client();
        assertEquals(List.of("asset_manage"), c.resolve("ADMIN"));
        clock[0] += 70_000L;
        assertEquals(List.of("asset_manage"), c.resolve("ADMIN"));
    }

    @Test
    void blankRole_returnsEmpty_noApiCall() {
        RolePermissionClient c = client();
        assertEquals(List.of(), c.resolve(""));
        assertEquals(List.of(), c.resolve(null));
        verify(rt, times(0)).exchange(anyString(), any(HttpMethod.class), any(), any(Class.class));
    }
}
