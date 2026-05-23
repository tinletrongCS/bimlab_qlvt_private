package com.bimlab.asset.config;

import com.bimlab.asset.controller.AssetController;
import com.bimlab.asset.controller.AssetDashboardController;
import com.bimlab.asset.controller.AssetTransferController;
import com.bimlab.asset.controller.ContractController;
import com.bimlab.asset.controller.MaintenanceController;
import com.bimlab.asset.controller.PurchaseRequestController;
import com.bimlab.asset.controller.SubscriptionController;
import com.bimlab.asset.controller.VendorController;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Q1: regression guard for the {@code @EnableMethodSecurity} + {@code @PreAuthorize}
 * wiring. A bootless reflection check is enough — if either side disappears,
 * every controller endpoint silently downgrades to "authenticated only" with no
 * authority requirement.
 *
 * <p>Why bootless: a full {@code @WebMvcTest} would pull
 * {@code AssetServiceApplication} (JPA + DataSource) into context and require
 * a test database. The annotation-presence assertion catches the only failure
 * mode this MR is concerned about (silent disable of method security) and runs
 * in milliseconds.
 */
class MethodSecurityWiringTest {

    @Test
    void securityConfig_hasEnableMethodSecurity() {
        EnableMethodSecurity annotation = SecurityConfig.class.getAnnotation(EnableMethodSecurity.class);
        assertTrue(annotation != null,
                "SecurityConfig must be annotated with @EnableMethodSecurity — without it, "
                        + "every @PreAuthorize on QLVT controllers silently no-ops.");
    }

    @Test
    void everyController_hasAtLeastOnePreAuthorizeAnnotatedMethod() {
        Class<?>[] controllers = {
                AssetController.class,
                AssetTransferController.class,
                MaintenanceController.class,
                PurchaseRequestController.class,
                ContractController.class,
                VendorController.class,
                SubscriptionController.class,
                AssetDashboardController.class
        };
        for (Class<?> controller : controllers) {
            boolean hasPreAuthorize = Arrays.stream(controller.getDeclaredMethods())
                    .anyMatch(m -> m.isAnnotationPresent(PreAuthorize.class));
            assertTrue(hasPreAuthorize,
                    controller.getSimpleName()
                            + " must have at least one @PreAuthorize-annotated method. "
                            + "Q1 migrated all non-object-context gates to declarative authorization.");
        }
    }

    // Match only authority literals inside hasAuthority(...) / hasAnyAuthority(...)
    // calls. A naïve "all single-quoted strings" parser would false-positive on
    // unrelated SpEL string args (e.g. @bean.method(#id, 'literal')) the day
    // someone adds a non-authority SpEL expression to a controller.
    private static final Pattern AUTHORITY_LITERAL =
            Pattern.compile("hasAn?yAuthority\\(\\s*('[^']+'(?:\\s*,\\s*'[^']+')*)\\s*\\)");
    private static final Pattern QUOTED = Pattern.compile("'([^']+)'");

    @Test
    void preAuthorize_referencesOnlyKnownPermissionStrings() {
        // Drift guard: any hasAuthority/hasAnyAuthority literal in a QLVT
        // controller must map to a Permission.code() value. Catches typos and
        // renames before they reach runtime.
        Class<?>[] controllers = {
                AssetController.class,
                AssetTransferController.class,
                MaintenanceController.class,
                PurchaseRequestController.class,
                ContractController.class,
                VendorController.class,
                SubscriptionController.class,
                AssetDashboardController.class
        };
        var knownCodes = Arrays.stream(com.bimlab.asset.security.Permission.values())
                .map(com.bimlab.asset.security.Permission::code)
                .toList();
        for (Class<?> controller : controllers) {
            for (Method method : controller.getDeclaredMethods()) {
                PreAuthorize annotation = method.getAnnotation(PreAuthorize.class);
                if (annotation == null) continue;
                String expr = annotation.value();
                Matcher call = AUTHORITY_LITERAL.matcher(expr);
                while (call.find()) {
                    Matcher literal = QUOTED.matcher(call.group(1));
                    while (literal.find()) {
                        String authority = literal.group(1);
                        assertTrue(knownCodes.contains(authority),
                                "Unknown authority literal '" + authority + "' in "
                                        + controller.getSimpleName() + "." + method.getName()
                                        + "() — must be one of Permission.values().");
                    }
                }
            }
        }
    }
}
