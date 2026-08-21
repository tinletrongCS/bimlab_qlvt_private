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
import java.util.stream.Collectors;

/**
 * Returns safe business messages to callers and logs raw exception text server-side
 * to prevent SQL and Hibernate detail disclosure.
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
    ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException e) {
        Map<String, String> fields = e.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        error -> error.getField(),
                        error -> error.getDefaultMessage() == null ? "Không hợp lệ" : error.getDefaultMessage(),
                        (first, ignored) -> first
                ));
        e.getBindingResult().getGlobalErrors().forEach(error ->
                fields.put(error.getObjectName(), error.getDefaultMessage() == null ? "Không hợp lệ" : error.getDefaultMessage())
        );
        String message = fields.entrySet().stream()
                .findFirst()
                .map(entry -> entry.getKey() + ": " + entry.getValue())
                .orElse("Dữ liệu không hợp lệ");
        return ResponseEntity.badRequest().body(Map.of("message", message, "fields", fields));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException e) {
        log.info("400 bad request: {}", e.getMessage());
        return ResponseEntity.badRequest().body(Map.of("message", safeBadRequestMessage(e.getMessage())));
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

    // TOCTOU race on UNIQUE asset columns maps to 409 without exposing schema details.
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String, String>> dataIntegrity(DataIntegrityViolationException e) {
        log.info("409 data integrity: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", "Dữ liệu vi phạm ràng buộc (trùng mã hoặc khóa khác)"));
    }

    private String safeBadRequestMessage(String message) {
        if (message == null || message.isBlank()) {
            return "Yêu cầu không hợp lệ";
        }

        String safe = message.lines().findFirst().orElse("").trim()
                .replaceFirst("(?i)\\s*\\([^)]*(schema|constraint|foreign key|sql|hibernate|jdbc)[^)]*\\)\\s*$", "")
                .trim();
        if (safe.isBlank()
                || safe.length() > 300
                || safe.matches("(?i).*(schema\\s|constraint|foreign key|hibernate|jdbc|org\\.postgresql).*")) {
            return "Yêu cầu không hợp lệ";
        }
        return safe;
    }
}
