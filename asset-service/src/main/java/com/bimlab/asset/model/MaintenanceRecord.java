package com.bimlab.asset.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.bimlab.asset.model.status.MaintenanceStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "maintenance_records", schema = "asset", indexes = {
        @Index(name = "idx_maintenance_records_asset_id", columnList = "asset_id"),
        @Index(name = "idx_maintenance_records_vendor_id", columnList = "vendor_id"),
        @Index(name = "idx_maintenance_records_maintenance_date", columnList = "maintenance_date"),
        @Index(name = "idx_maintenance_records_next_maintenance_date", columnList = "next_maintenance_date"),
        @Index(name = "idx_maintenance_records_status", columnList = "status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MaintenanceRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "asset_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private AssetItem asset;

    @Column(length = 30, nullable = false)
    private String maintenanceType;

    @Column(name = "maintenance_date", nullable = false)
    private LocalDate maintenanceDate;

    @Column(precision = 18, scale = 2)
    private BigDecimal cost;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vendor_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Vendor vendor;

    @Column(length = 200)
    private String performedBy;

    @Column(length = 1000)
    private String description;

    @Column(name = "next_maintenance_date")
    private LocalDate nextMaintenanceDate;

    @Column(name = "downtime_hours", precision = 10, scale = 2)
    private BigDecimal downtimeHours;

    @Column(name = "meter_reading", precision = 18, scale = 2)
    private BigDecimal meterReading;

    @Column(name = "condition_after", length = 500)
    private String conditionAfter;

    @Enumerated(EnumType.STRING)
    @Column(length = 30, nullable = false)
    private MaintenanceStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (status == null) status = MaintenanceStatus.COMPLETED;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
