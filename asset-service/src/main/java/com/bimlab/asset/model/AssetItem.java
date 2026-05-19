package com.bimlab.asset.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "assets", schema = "asset", indexes = {
        @Index(name = "idx_assets_code", columnList = "assetCode"),
        @Index(name = "idx_assets_assignee", columnList = "assignedEmployeeId"),
        @Index(name = "idx_assets_department", columnList = "departmentId")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AssetItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 60)
    private String assetCode;
    @Column(nullable = false, length = 180)
    private String name;
    @Column(nullable = false, length = 80)
    private String category;
    @Column(length = 80)
    private String serialNumber;
    @Column(length = 120)
    private String source;
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vendor_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Vendor vendor;
    private Long assignedEmployeeId;
    private Long departmentId;
    private Long siteId;
    private Long projectId;
    @Column(precision = 16, scale = 2)
    private BigDecimal purchaseCost;
    @Column(precision = 16, scale = 2)
    private BigDecimal residualValue;
    private LocalDate purchaseDate;
    private LocalDate warrantyUntil;
    @Column(length = 30, nullable = false)
    private String status;

    @Column(length = 30)
    private String depreciationMethod;
    private Integer usefulLifeYears;

    private LocalDate disposalDate;
    @Column(precision = 16, scale = 2)
    private BigDecimal disposalPrice;
    @Column(length = 500)
    private String disposalReason;

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
        if (status == null || status.isBlank()) status = "IN_STOCK";
        if (residualValue == null) residualValue = purchaseCost;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
