package com.bimlab.asset.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "asset_transfers", schema = "asset", indexes = {
        @Index(name = "idx_transfers_asset", columnList = "asset_id"),
        @Index(name = "idx_transfers_date", columnList = "transferDate"),
        @Index(name = "idx_transfers_from_emp", columnList = "fromEmployeeId"),
        @Index(name = "idx_transfers_to_emp", columnList = "toEmployeeId")
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

    private Long fromEmployeeId;
    private Long toEmployeeId;
    private Long fromDepartmentId;
    private Long toDepartmentId;
    private Long fromSiteId;
    private Long toSiteId;

    @Column(nullable = false)
    private LocalDate transferDate;

    @Column(length = 1000)
    private String reason;

    @Column(length = 200)
    private String performedBy;

    @Column(length = 500)
    private String handoverDocumentUrl;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
