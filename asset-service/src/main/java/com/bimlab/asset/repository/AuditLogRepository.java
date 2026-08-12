package com.bimlab.asset.repository;

import com.bimlab.asset.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByEntityTypeAndEntityIdOrderByOccurredAtDesc(String entityType, Long entityId, Pageable pageable);

    Page<AuditLog> findByEntityTypeAndEntityIdAndChangedFieldsIsNotNullOrderByOccurredAtDesc(
            String entityType,
            Long entityId,
            Pageable pageable
    );

    List<AuditLog> findByEntityTypeAndEntityIdAndActionAndChangedFieldsIsNotNullOrderByOccurredAtDesc(
            String entityType,
            Long entityId,
            String action
    );
}
