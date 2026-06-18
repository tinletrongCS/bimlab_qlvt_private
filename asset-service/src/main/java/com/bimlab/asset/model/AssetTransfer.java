package com.bimlab.asset.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "asset_transfers", schema = "asset", indexes = {
        @Index(name = "idx_asset_transfers_asset_id", columnList = "asset_id"),
        @Index(name = "idx_asset_transfers_transfer_date", columnList = "transfer_date"),
        @Index(name = "idx_asset_transfers_from_employee_id", columnList = "from_employee_id"),
        @Index(name = "idx_asset_transfers_to_employee_id", columnList = "to_employee_id"),
        @Index(name = "idx_asset_transfers_from_department_id", columnList = "from_department_id"),
        @Index(name = "idx_asset_transfers_to_department_id", columnList = "to_department_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AssetTransfer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "asset_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private AssetItem asset;

    @Column(length = 30, nullable = false)
    private String transferType;

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

    @Column(name = "transfer_date", nullable = false)
    private LocalDate transferDate;

    @Column(name = "condition_before", length = 500)
    private String conditionBefore;

    @Column(name = "condition_after", length = 500)
    private String conditionAfter;

    @Column(length = 1000)
    private String reason;

    @Column(length = 200)
    private String performedBy;

    @Column(name = "handover_document_url", length = 500)
    private String handoverDocumentUrl;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "handover_document_id")
    @JsonIgnoreProperties({"asset", "hibernateLazyInitializer", "handler"})
    private AssetDocument handoverDocument;

    @Column(name = "approved_by", length = 200)
    private String approvedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
