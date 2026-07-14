package com.bimlab.asset.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "asset_transfer_headers", schema = "asset")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetTransferHeader {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transfer_code", length = 60)
    private String transferCode;

    @Column(length = 200)
    private String title;

    @Column(name = "transfer_type", length = 30)
    private String transferType;

    @Column(length = 30, nullable = false)
    @Builder.Default
    private String status = "DRAFT";

    @Column(name = "requested_by", length = 200)
    private String requestedBy;

    @Column(name = "requested_employee_id")
    private Long requestedEmployeeId;

    @Column(name = "approved_by", length = 200)
    private String approvedBy;

    @Column(name = "cancelled_by", length = 200)
    private String cancelledBy;

    @Column(name = "from_employee_id")
    private Long fromEmployeeId;

    @Column(name = "to_employee_id")
    private Long toEmployeeId;

    @Column(name = "from_department_id")
    private Long fromDepartmentId;

    @Column(name = "to_department_id")
    private Long toDepartmentId;

    @Column(name = "from_site_id")
    private Long fromSiteId;

    @Column(name = "to_site_id")
    private Long toSiteId;

    @Column(name = "from_project_id")
    private Long fromProjectId;

    @Column(name = "to_project_id")
    private Long toProjectId;

    @Column(name = "transfer_date")
    private LocalDate transferDate;

    @Column(name = "planned_handover_at")
    private LocalDateTime plannedHandoverAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Column(length = 1000)
    private String reason;

    @Column(length = 1000)
    private String note;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (status == null) {
            status = "DRAFT";
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
