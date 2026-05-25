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
        @Index(name = "idx_contracts_number", columnList = "contractNumber"),
        @Index(name = "idx_contracts_status", columnList = "status"),
        @Index(name = "idx_contracts_vendor", columnList = "vendor_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Contract {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
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

    private LocalDate signDate;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;

    @Column(precision = 18, scale = 2)
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

    @Column(length = 1000)
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
        if (status == null) status = ContractStatus.DRAFT;
        if (currency == null || currency.isBlank()) currency = "VND";
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
