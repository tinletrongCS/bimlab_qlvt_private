package com.bimlab.asset.config;

import com.bimlab.asset.storage.MinioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.ApplicationContext;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.test.context.ActiveProfiles;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * N9 (deferred-from-Q2-followup, landed in Q8): boot smoke that asserts the
 * Spring Security method-security infrastructure is actually wired into the
 * application context. If {@link EnableMethodSecurity} is silently absent,
 * every {@code @PreAuthorize} in the codebase no-ops — a hard-to-spot
 * authorization regression. This test fails loudly if that ever happens.
 */
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
    void methodSecurityInterceptor_isPresent() {
        // Spring Security 6 with @EnableMethodSecurity registers an
        // authorization MethodInterceptor bean. We don't pin the exact bean
        // name (it varies between minor versions) — just assert at least one
        // method-security advisor lives in the context.
        Map<String, Object> advisors = context.getBeansWithAnnotation(EnableMethodSecurity.class);
        boolean methodSecurityActive = advisors.values().stream()
                .anyMatch(bean -> bean.getClass().isAnnotationPresent(EnableMethodSecurity.class)
                        || bean.getClass().getSuperclass().isAnnotationPresent(EnableMethodSecurity.class));

        // Fallback: also assert at least one of the known interceptor bean
        // names is registered (covers cases where the @EnableMethodSecurity
        // annotation lives on a parent class scanned indirectly).
        boolean interceptorBeanPresent =
                context.containsBean("methodSecurityAdvisor")
                        || context.containsBean("authorizationManagerBeforeMethodInterceptor")
                        || context.containsBean("preAuthorizeAuthorizationMethodInterceptor")
                        || context.containsBean("preFilterAuthorizationMethodInterceptor");

        assertNotNull(context);
        assertTrue(methodSecurityActive || interceptorBeanPresent,
                "Spring Security method-security must be wired (production " +
                        "SecurityConfig @EnableMethodSecurity must take effect).");
    }
}
