package com.bimlab.asset.entity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class AuditLogTest {

    @Test
    void prePersist_setsDefaults() {
        AuditLog log = new AuditLog();

        log.prePersist();

        assertNotNull(log.getOccurredAt());
        assertEquals("INFO", log.getSeverity());
    }

    @Test
    void prePersist_preservesProvidedValues() {
        AuditLog log = AuditLog.builder()
                .occurredAt(java.time.LocalDateTime.of(2026, 7, 14, 10, 0))
                .severity("WARNING")
                .build();

        log.prePersist();

        assertEquals(java.time.LocalDateTime.of(2026, 7, 14, 10, 0), log.getOccurredAt());
        assertEquals("WARNING", log.getSeverity());
    }
}
