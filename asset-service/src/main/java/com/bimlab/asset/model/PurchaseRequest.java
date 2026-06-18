package com.bimlab.asset.model;

import jakarta.persistence.*;
import com.bimlab.asset.model.status.PurchaseRequestStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "purchase_requests", schema = "asset", indexes = {
        @Index(name = "idx_purchase_requests_status", columnList = "status"),
        @Index(name = "idx_purchase_requests_requester_employee_id", columnList = "requester_employee_id"),
        @Index(name = "idx_purchase_requests_department_id", columnList = "department_id"),
        @Index(name = "idx_purchase_requests_site_id", columnList = "site_id"),
        @Index(name = "idx_purchase_requests_project_id", columnList = "project_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PurchaseRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "request_type", nullable = false, length = 40)
    private String requestType;
    @Column(nullable = false, length = 180)
    private String title;
    @Column(columnDefinition = "text")
    private String reason;
    @Column(name = "estimated_cost", precision = 18, scale = 2)
    private BigDecimal estimatedCost;
    @Column(name = "requester_employee_id")
    private Long requesterEmployeeId;
    @Column(name = "department_id")
    private Long departmentId;
    @Column(name = "site_id")
    private Long siteId;
    @Column(name = "project_id")
    private Long projectId;
    @Column(name = "needed_date")
    private LocalDate neededDate;
    @Enumerated(EnumType.STRING)
    @Column(length = 30, nullable = false)
    private PurchaseRequestStatus status;
    @Column(length = 500)
    private String notes;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (status == null) status = PurchaseRequestStatus.DRAFT;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
