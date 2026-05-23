package com.bimlab.asset.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.NoSuchElementException;

/**
 * F3: previously echoed raw e.getMessage() for NoSuchElement, IllegalArgument,
 * IllegalState and AccessDenied — leaking SQL/Hibernate internals when callers
 * triggered downstream JPA exceptions wrapped into IllegalState. Now returns
 * static Vietnamese messages; raw exception text is logged server-side at INFO.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(NoSuchElementException.class)
    ResponseEntity<Map<String, String>> notFound(NoSuchElementException e) {
        log.info("404 not found: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", "Không tìm thấy tài nguyên"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, String>> validation(MethodArgumentNotValidException e) {
        return ResponseEntity.badRequest().body(Map.of("message", "Dữ liệu không hợp lệ"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException e) {
        log.info("400 bad request: {}", e.getMessage());
        return ResponseEntity.badRequest().body(Map.of("message", "Yêu cầu không hợp lệ"));
    }

    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<Map<String, String>> conflict(IllegalStateException e) {
        log.info("409 conflict: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", "Thao tác xung đột với trạng thái hiện tại"));
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<Map<String, String>> forbidden(AccessDeniedException e) {
        log.info("403 forbidden: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("message", "Không có quyền thực hiện thao tác này"));
    }

    // Phase 7 prep: TOCTOU race on UNIQUE asset columns (asset code/serial)
    // previously fell through to Spring default → 500 with raw Hibernate
    // schema details. Map to 409 with sanitised message.
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String, String>> dataIntegrity(DataIntegrityViolationException e) {
        log.info("409 data integrity: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", "Dữ liệu vi phạm ràng buộc (trùng mã hoặc khóa khác)"));
    }
}
