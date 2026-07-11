package com.bimlab.asset.controller;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PagedEndpointWiringTest {

    @Test
    void allListBearingControllers_haveListPagedEndpoint() throws Exception {
        Class<?>[] controllers = {
                AssetController.class,
                VendorController.class,
                SubscriptionController.class,
                PurchaseRequestController.class,
                ContractController.class,
                MaintenanceController.class,
                AssetTransferController.class,
        };
        for (Class<?> ctrl : controllers) {
            Method paged = find(ctrl, "listPaged");
            assertNotNull(paged, ctrl.getSimpleName() + " missing listPaged()");

            GetMapping gm = paged.getAnnotation(GetMapping.class);
            assertNotNull(gm, ctrl.getSimpleName() + " listPaged missing @GetMapping");
            assertEquals("/paged", gm.value()[0],
                    ctrl.getSimpleName() + " listPaged path must be /paged");

            PreAuthorize pa = paged.getAnnotation(PreAuthorize.class);
            assertNotNull(pa, ctrl.getSimpleName() + " listPaged missing @PreAuthorize");
            assertTrue(pa.value().contains("asset"),
                    ctrl.getSimpleName() + " listPaged PreAuthorize must scope to asset perms");

            assertEquals(Page.class, paged.getReturnType(),
                    ctrl.getSimpleName() + " listPaged must return Page<T>");
        }
    }

    private Method find(Class<?> cls, String name) {
        for (Method m : cls.getDeclaredMethods()) {
            if (m.getName().equals(name)) return m;
        }
        return null;
    }
}
