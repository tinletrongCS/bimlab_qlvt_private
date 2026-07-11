package com.bimlab.asset.config;

import com.bimlab.asset.storage.MinioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

// MOCK environment (not NONE) so the production SecurityConfig.filterChain
// — which @Autowires HttpSecurity — can resolve. We don't actually hit
// any HTTP endpoint here; only verifying the method-security wiring.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class MethodSecurityBootSmokeTest {

    @Autowired ApplicationContext context;
    // MinIO @PostConstruct tries to connect to localhost:9000 in real config.
    // Mock it so the smoke test doesn't depend on a live MinIO container.
    @MockBean MinioService minioService;

    @Test
    void preAuthorizeMethodInterceptor_isPresent() {
        assertNotNull(context);
        assertTrue(context.containsBean("preAuthorizeAuthorizationMethodInterceptor"),
                "Spring Security must register the pre-authorize method interceptor.");
    }
}
