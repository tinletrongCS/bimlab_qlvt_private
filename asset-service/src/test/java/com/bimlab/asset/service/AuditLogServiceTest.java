package com.bimlab.asset.service;

import com.bimlab.asset.entity.AuditLog;
import com.bimlab.asset.repository.AuditLogRepository;
import com.bimlab.asset.security.AssetAccessService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock AuditLogRepository auditLogs;
    @Mock AssetAccessService access;

    @InjectMocks AuditLogService service;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void log_capturesActorAndPayload() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "admin",
                        "n/a",
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
        when(access.getCurrentEmployeeId()).thenReturn(7L);
        when(access.getCurrentUsername()).thenReturn("admin");
        when(auditLogs.save(any(AuditLog.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuditLog saved = service.log(
                "ASSET_TRANSFER",
                "ASSET",
                12L,
                "AST-012",
                "TRANSFER_APPLIED",
                "Cập nhật tài sản",
                Map.of("status", "IN_STOCK"),
                Map.of("status", "ASSIGNED"),
                Map.of("status", Map.of("before", "IN_STOCK", "after", "ASSIGNED")));

        assertEquals(7L, saved.getActorEmployeeId());
        assertEquals("admin", saved.getActorUsername());
        assertEquals("ADMIN", saved.getActorRole());
        assertEquals("ASSET_TRANSFER", saved.getModule());
        assertEquals("ASSET", saved.getEntityType());
        assertEquals(12L, saved.getEntityId());
        assertEquals("TRANSFER_APPLIED", saved.getAction());
        assertEquals("INFO", saved.getSeverity());
        verify(auditLogs).save(saved);
    }

    @Test
    void listByEntity_mapsStoredLog() {
        AuditLog log = AuditLog.builder()
                .id(3L)
                .occurredAt(LocalDateTime.of(2026, 7, 14, 10, 0))
                .actorEmployeeId(7L)
                .actorUsername("admin")
                .actorRole("ADMIN")
                .module("ASSET_TRANSFER")
                .entityType("ASSET")
                .entityId(12L)
                .entityCode("AST-012")
                .action("TRANSFER_APPLIED")
                .severity("INFO")
                .summary("Cập nhật tài sản")
                .beforeData(Map.of("status", "IN_STOCK"))
                .afterData(Map.of("status", "ASSIGNED"))
                .changedFields(Map.of("status", "changed"))
                .requestId("req-1")
                .ipAddress("127.0.0.1")
                .userAgent("test")
                .build();
        when(auditLogs.findByEntityTypeAndEntityIdOrderByOccurredAtDesc("ASSET", 12L, PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of(log)));

        var page = service.listByEntity("ASSET", 12L, PageRequest.of(0, 20));

        assertEquals(1, page.getTotalElements());
        assertEquals("AST-012", page.getContent().get(0).entityCode());
        assertEquals("req-1", page.getContent().get(0).requestId());
    }
}
