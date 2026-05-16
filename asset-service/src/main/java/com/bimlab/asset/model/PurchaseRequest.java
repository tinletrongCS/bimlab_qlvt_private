package com.bimlab.asset.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "purchase_requests", schema = "asset", indexes = {
        @Index(name = "idx_purchase_requests_status", columnList = "status"),
        @Index(name = "idx_purchase_requests_requester", columnList = "requesterEmployeeId")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PurchaseRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 40)
    private String requestType;
    @Column(nullable = false, length = 180)
    private String title;
    @Column(columnDefinition = "text")
    private String reason;
    @Column(precision = 16, scale = 2)
    private BigDecimal estimatedCost;
    private Long requesterEmployeeId;
    private Long departmentId;
    private Long siteId;
    private Long projectId;
    private LocalDate neededDate;
    @Column(length = 30, nullable = false)
    private String status;
    @Column(length = 500)
    private String notes;
    @Column(nullable = false)
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (status == null || status.isBlank()) status = "DRAFT";
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
