package com.bimlab.asset.dto.response;

import java.time.LocalDateTime;
import java.util.Map;

public record AuditLogResponse(
        Long id,
        LocalDateTime occurredAt,
        Long actorEmployeeId,
        String actorUsername,
        String actorRole,
        String module,
        String entityType,
        Long entityId,
        String entityCode,
        String action,
        String severity,
        String summary,
        Map<String, Object> beforeData,
        Map<String, Object> afterData,
        Map<String, Object> changedFields,
        String requestId,
        String ipAddress,
        String userAgent
) {
}
