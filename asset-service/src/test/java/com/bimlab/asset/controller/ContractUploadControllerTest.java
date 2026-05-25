package com.bimlab.asset.controller;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Q7: reflection-based wiring guard for contract upload/view endpoints.
 * Mirrors MethodSecurityWiringTest pattern — assert annotations are present
 * without spinning up a full @WebMvcTest (Q1 lesson: brittle).
 */
class ContractUploadControllerTest {

    @Test
    void uploadEndpoint_hasPostMappingAndPreAuthorize() throws NoSuchMethodException {
        Method upload = findUpload();
        PostMapping pm = upload.getAnnotation(PostMapping.class);
        assertNotNull(pm, "upload must be annotated @PostMapping");
        assertTrue(pm.value().length > 0 && pm.value()[0].equals("/upload"),
                "upload path must be /upload");
        assertEquals(MediaType.MULTIPART_FORM_DATA_VALUE, pm.consumes()[0],
                "upload must consume multipart/form-data");

        PreAuthorize pa = upload.getAnnotation(PreAuthorize.class);
        assertNotNull(pa, "upload must be @PreAuthorize-gated");
        assertTrue(pa.value().contains("contract_manage"),
                "upload PreAuthorize must include contract_manage");
    }

    @Test
    void viewEndpoint_hasGetMappingAndPreAuthorize() throws NoSuchMethodException {
        Method view = ContractController.class.getDeclaredMethod("view", String.class);
        GetMapping gm = view.getAnnotation(GetMapping.class);
        assertNotNull(gm, "view must be annotated @GetMapping");
        assertTrue(gm.value().length > 0 && gm.value()[0].equals("/files/view"),
                "view path must be /files/view");

        PreAuthorize pa = view.getAnnotation(PreAuthorize.class);
        assertNotNull(pa, "view must be @PreAuthorize-gated");
        assertTrue(pa.value().contains("contract_manage"),
                "view PreAuthorize must include contract_manage");
    }

    private Method findUpload() throws NoSuchMethodException {
        for (Method m : ContractController.class.getDeclaredMethods()) {
            if (m.getName().equals("upload")) return m;
        }
        throw new NoSuchMethodException("ContractController.upload not found");
    }
}
