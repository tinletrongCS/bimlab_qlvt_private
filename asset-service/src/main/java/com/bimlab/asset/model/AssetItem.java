package com.bimlab.asset.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.bimlab.asset.model.status.AssetClass;
import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.model.status.FixedAssetType;
import com.bimlab.asset.model.status.ToolUsageType;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "assets", schema = "asset", indexes = {
        @Index(name = "idx_assets_asset_code", columnList = "asset_code"),
        @Index(name = "idx_assets_catalog_item_id", columnList = "catalog_item_id"),
        @Index(name = "idx_assets_category_id", columnList = "category_id"),
        @Index(name = "idx_assets_parent_asset_id", columnList = "parent_asset_id"),
        @Index(name = "idx_assets_asset_class", columnList = "asset_class"),
        @Index(name = "idx_assets_status", columnList = "status"),
        @Index(name = "idx_assets_assigned_employee_id", columnList = "assigned_employee_id"),
        @Index(name = "idx_assets_department_id", columnList = "department_id"),
        @Index(name = "idx_assets_site_id", columnList = "site_id"),
        @Index(name = "idx_assets_project_id", columnList = "project_id"),
        @Index(name = "idx_assets_vendor_id", columnList = "vendor_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AssetItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "asset_code", nullable = false, unique = true, length = 80)
    private String assetCode;

    @Column(nullable = false, length = 255)
    private String name;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "catalog_item_id")
    @JsonIgnoreProperties({"category", "hibernateLazyInitializer", "handler"})
    private AssetCatalogItem catalogItem;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    @JsonIgnoreProperties({"parent", "hibernateLazyInitializer", "handler"})
    private AssetCategory assetCategory;

    @Column(length = 80)
    private String category;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "parent_asset_id")
    @JsonIgnoreProperties({"parentAsset", "hibernateLazyInitializer", "handler"})
    private AssetItem parentAsset;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_class", nullable = false, length = 40)
    private AssetClass assetClass;

    @Enumerated(EnumType.STRING)
    @Column(name = "fixed_asset_type", length = 40)
    private FixedAssetType fixedAssetType;

    @Enumerated(EnumType.STRING)
    @Column(name = "tool_usage_type", length = 40)
    private ToolUsageType toolUsageType;

    @Column(name = "serial_number", length = 120)
    private String serialNumber;

    @Column(length = 120)
    private String source;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vendor_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Vendor vendor;

    @Column(name = "assigned_employee_id")
    private Long assignedEmployeeId;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "site_id")
    private Long siteId;

    @Column(name = "project_id")
    private Long projectId;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "use_date")
    private LocalDate useDate;

    @Column(name = "depreciation_start_date")
    private LocalDate depreciationStartDate;

    @Column(name = "warranty_until")
    private LocalDate warrantyUntil;

    @Column(name = "original_cost", precision = 18, scale = 2)
    private BigDecimal originalCost;

    @Column(name = "purchase_cost", precision = 18, scale = 2)
    private BigDecimal purchaseCost;

    @Column(name = "accumulated_depreciation", nullable = false, precision = 18, scale = 2)
    private BigDecimal accumulatedDepreciation;

    @Column(name = "book_value", precision = 18, scale = 2)
    private BigDecimal bookValue;

    @Column(name = "residual_value", precision = 18, scale = 2)
    private BigDecimal residualValue;

    @Column(name = "depreciation_method", length = 40)
    private String depreciationMethod;

    @Column(name = "useful_life_months")
    private Integer usefulLifeMonths;

    @Column(name = "useful_life_years")
    private Integer usefulLifeYears;

    @Column(name = "depreciation_rate", precision = 8, scale = 4)
    private BigDecimal depreciationRate;

    @Column(name = "manufacture_year")
    private Integer manufactureYear;

    @Column(name = "installation_year")
    private Integer installationYear;

    @Column(name = "country_code", length = 10)
    private String countryCode;

    @Column(precision = 18, scale = 4)
    private BigDecimal capacity;

    @Column(name = "capacity_unit", length = 40)
    private String capacityUnit;

    @Column(name = "real_capacity", precision = 18, scale = 4)
    private BigDecimal realCapacity;

    @Column(name = "technical_description", length = 2000)
    private String technicalDescription;

    @Enumerated(EnumType.STRING)
    @Column(length = 30, nullable = false)
    private AssetStatus status;

    @Column(name = "disposal_date")
    private LocalDate disposalDate;

    @Column(name = "disposal_price", precision = 18, scale = 2)
    private BigDecimal disposalPrice;

    @Column(name = "disposal_reason", length = 500)
    private String disposalReason;

    @Column(length = 1000)
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
        if (status == null) status = AssetStatus.IN_STOCK;
        if (assetClass == null) assetClass = AssetClass.FIXED_ASSET;
        if (assetClass == AssetClass.FIXED_ASSET && fixedAssetType == null) {
            fixedAssetType = FixedAssetType.TANGIBLE;
        }
        if (assetClass == AssetClass.TOOL_EQUIPMENT && toolUsageType == null) {
            toolUsageType = ToolUsageType.MULTI_USE;
        }
        if (originalCost == null) originalCost = purchaseCost;
        if (accumulatedDepreciation == null) accumulatedDepreciation = BigDecimal.ZERO;
        if (residualValue == null) residualValue = purchaseCost;
        if (bookValue == null) {
            bookValue = residualValue != null ? residualValue : originalCost;
        }
        if (depreciationMethod == null) depreciationMethod = "STRAIGHT_LINE";
        if (usefulLifeMonths == null && usefulLifeYears != null) {
            usefulLifeMonths = usefulLifeYears * 12;
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
