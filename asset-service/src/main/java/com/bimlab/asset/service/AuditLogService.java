package com.bimlab.asset.service;

import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bimlab.asset.dto.response.AuditLogResponse;
import com.bimlab.asset.model.AuditLog;
import com.bimlab.asset.repository.AuditLogRepository;
import com.bimlab.asset.security.AssetAccessService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuditLogService {
    public static final String ENTITY_ASSET = "ASSET"; // log cho từng tài sản
    public static final String ENTITY_ASSET_TRANSFER = "ASSET_TRANSFER"; // log cho phiếu bàn giao tài sản
    public static final String ENTITY_ASSET_TRANSFER_HEADER = "ASSET_TRANSFER_HEADER";

    private final AuditLogRepository auditLogs;
    private final AssetAccessService access;

    @Transactional
    public AuditLog log(
            String module,
            String entityType,
            Long entityId,
            String entityCode,
            String action,
            String summary,
            Map<String, Object> beforeData,
            Map<String, Object> afterData,
            Map<String, Object> changedFields
    ) {
        return auditLogs.save(AuditLog.builder()
                .actorEmployeeId(access.getCurrentEmployeeId())
                .actorUsername(access.getCurrentUsername())
                .actorRole(currentRole())
                .module(module)
                .entityType(entityType)
                .entityId(entityId)
                .entityCode(entityCode)
                .action(action)
                .severity("INFO")
                .summary(summary)
                .beforeData(beforeData)
                .afterData(afterData)
                .changedFields(changedFields)
                .build());
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> listByEntity(String entityType, Long entityId, Pageable pageable) {
        return auditLogs.findByEntityTypeAndEntityIdOrderByOccurredAtDesc(entityType, entityId, pageable)
                .map(this::toResponse);
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(
                log.getId(),
                log.getOccurredAt(),
                log.getActorEmployeeId(),
                log.getActorUsername(),
                log.getActorRole(),
                log.getModule(),
                log.getEntityType(),
                log.getEntityId(),
                log.getEntityCode(),
                log.getAction(),
                log.getSeverity(),
                log.getSummary(),
                log.getBeforeData(),
                log.getAfterData(),
                log.getChangedFields(),
                log.getRequestId(),
                log.getIpAddress(),
                log.getUserAgent()
        );
    }

    private String currentRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) return null;
        return authentication.getAuthorities().stream()
                .map(Object::toString)
                .filter(value -> value.startsWith("ROLE_"))
                .map(value -> value.substring("ROLE_".length()))
                .findFirst()
                .orElse(null);
    }
}
