package com.bimlab.asset.model;

import com.bimlab.asset.model.status.CatalogType;
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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "asset_catalog_items", schema = "asset", indexes = {
        @Index(name = "idx_asset_catalog_items_category_id", columnList = "category_id"),
        @Index(name = "idx_asset_catalog_items_catalog_type", columnList = "catalog_type"),
        @Index(name = "idx_asset_catalog_items_name", columnList = "name"),
        @Index(name = "idx_asset_catalog_items_is_active", columnList = "is_active")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetCatalogItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_code", nullable = false, unique = true, length = 80)
    private String itemCode;

    @Column(nullable = false, length = 255)
    private String name;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    @JsonIgnoreProperties({"parent", "hibernateLazyInitializer", "handler"})
    private AssetCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "catalog_type", nullable = false, length = 40)
    private CatalogType catalogType;

    @Column(name = "inventory_group", length = 120)
    private String inventoryGroup;

    @Column(length = 40)
    private String unit;

    @Column(name = "cost_value", precision = 18, scale = 2)
    private BigDecimal costValue;

    @Column(name = "standard_value", precision = 18, scale = 2)
    private BigDecimal standardValue;

    @Column(name = "fixed_value", precision = 18, scale = 2)
    private BigDecimal fixedValue;

    @Column(name = "internal_value", precision = 18, scale = 2)
    private BigDecimal internalValue;

    @Column(name = "technical_spec", length = 1000)
    private String technicalSpec;

    @Column(name = "is_active", nullable = false)
    private Boolean active;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (active == null) active = true;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
