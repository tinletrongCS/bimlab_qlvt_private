package com.bimlab.asset.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.bimlab.asset.model.status.ContractStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "contracts", schema = "asset", indexes = {
        @Index(name = "idx_contracts_contract_number", columnList = "contract_number"),
        @Index(name = "idx_contracts_status", columnList = "status"),
        @Index(name = "idx_contracts_vendor_id", columnList = "vendor_id"),
        @Index(name = "idx_contracts_purchase_request_id", columnList = "purchase_request_id"),
        @Index(name = "idx_contracts_asset_id", columnList = "asset_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Contract {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_number", nullable = false, unique = true, length = 80)
    private String contractNumber;

    @Column(nullable = false, length = 200)
    private String title;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vendor_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Vendor vendor;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "purchase_request_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private PurchaseRequest purchaseRequest;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "asset_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private AssetItem asset;

    @Column(name = "sign_date")
    private LocalDate signDate;
    @Column(name = "effective_from")
    private LocalDate effectiveFrom;
    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "contract_value", precision = 18, scale = 2)
    private BigDecimal contractValue;

    @Column(length = 10)
    private String currency;

    @Column(columnDefinition = "text")
    private String paymentTerms;

    @Enumerated(EnumType.STRING)
    @Column(length = 30, nullable = false)
    private ContractStatus status;

    @Column(length = 500)
    private String attachmentUrl;

    // Q7: object key in MinIO bucket (preferred); attachmentUrl kept for legacy back-compat
    @Column(name = "attachment_object_key", length = 500)
    private String attachmentObjectKey;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "document_id")
    @JsonIgnoreProperties({"asset", "hibernateLazyInitializer", "handler"})
    private AssetDocument document;

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
        if (status == null) status = ContractStatus.DRAFT;
        if (currency == null || currency.isBlank()) currency = "VND";
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
