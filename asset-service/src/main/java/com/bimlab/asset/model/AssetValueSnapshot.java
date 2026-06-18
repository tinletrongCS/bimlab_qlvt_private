package com.bimlab.asset.model;

import com.bimlab.asset.model.status.ValueSnapshotSource;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "asset_value_snapshots", schema = "asset",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_asset_value_snapshots_asset_date_source",
                columnNames = {"asset_id", "snapshot_date", "source"}),
        indexes = {
                @Index(name = "idx_asset_value_snapshots_asset_id", columnList = "asset_id"),
                @Index(name = "idx_asset_value_snapshots_snapshot_date", columnList = "snapshot_date"),
                @Index(name = "idx_asset_value_snapshots_source", columnList = "source")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetValueSnapshot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "asset_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private AssetItem asset;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "original_cost", nullable = false, precision = 18, scale = 2)
    private BigDecimal originalCost;

    @Column(name = "period_depreciation", nullable = false, precision = 18, scale = 2)
    private BigDecimal periodDepreciation;

    @Column(name = "accumulated_depreciation", nullable = false, precision = 18, scale = 2)
    private BigDecimal accumulatedDepreciation;

    @Column(name = "book_value", nullable = false, precision = 18, scale = 2)
    private BigDecimal bookValue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 80)
    private ValueSnapshotSource source;

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        if (periodDepreciation == null) periodDepreciation = BigDecimal.ZERO;
        if (accumulatedDepreciation == null) accumulatedDepreciation = BigDecimal.ZERO;
        if (source == null) source = ValueSnapshotSource.SYSTEM_CALCULATION;
    }
}
