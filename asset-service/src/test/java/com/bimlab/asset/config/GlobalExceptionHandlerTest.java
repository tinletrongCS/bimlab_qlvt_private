package com.bimlab.asset.config;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

import java.util.Map;
import java.util.NoSuchElementException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * F3: handlers must NOT echo raw e.getMessage() — previously these leaked
 * SQL/Hibernate internals + table names when downstream JPA exceptions wrapped
 * into IllegalStateException reached the controller. Now each handler returns
 * a static Vietnamese message; raw text is logged server-side only.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void notFound_returnsStaticMessage_notRaw() {
        var e = new NoSuchElementException("PurchaseRequest id=42 in schema asset.purchase_requests not present");

        ResponseEntity<Map<String, String>> response = handler.notFound(e);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        String body = response.getBody().get("message");
        assertEquals("Không tìm thấy tài nguyên", body);
        assertFalse(body.contains("schema asset"));
        assertFalse(body.contains("purchase_requests"));
    }

    @Test
    void badRequest_returnsStaticMessage_notRaw() {
        var e = new IllegalArgumentException("Số hợp đồng đã tồn tại: HD-2026-001 (asset.contracts unique constraint uk_contract_number)");

        ResponseEntity<Map<String, String>> response = handler.badRequest(e);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        String body = response.getBody().get("message");
        assertEquals("Yêu cầu không hợp lệ", body);
        assertFalse(body.contains("constraint"));
        assertFalse(body.contains("HD-2026-001"));
    }

    @Test
    void conflict_returnsStaticMessage_notRaw() {
        var e = new IllegalStateException("Cannot delete asset id=99: maintenance_records.fk_maint_asset still references it");

        ResponseEntity<Map<String, String>> response = handler.conflict(e);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        String body = response.getBody().get("message");
        assertEquals("Thao tác xung đột với trạng thái hiện tại", body);
        assertFalse(body.contains("fk_maint_asset"));
        assertFalse(body.contains("maintenance_records"));
    }

    @Test
    void forbidden_returnsStaticMessage_notRaw() {
        var e = new AccessDeniedException("Chỉ asset_manage mới được phép sửa siteId=10 departmentId=20");

        ResponseEntity<Map<String, String>> response = handler.forbidden(e);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        String body = response.getBody().get("message");
        assertEquals("Không có quyền thực hiện thao tác này", body);
        assertFalse(body.contains("siteId"));
    }
}
