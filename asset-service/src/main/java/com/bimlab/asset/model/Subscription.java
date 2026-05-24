package com.bimlab.asset.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.bimlab.asset.model.status.SubscriptionStatus;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "subscriptions", schema = "asset", indexes = {
        @Index(name = "idx_subscriptions_renewal", columnList = "renewalDate"),
        @Index(name = "idx_subscriptions_status", columnList = "status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Subscription {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 180)
    private String softwareName;
    @Column(length = 120)
    private String planName;
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "vendor_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Vendor vendor;
    @Column(nullable = false)
    private Integer totalSeats;
    @Column(nullable = false)
    private Integer usedSeats;
    @Column(precision = 16, scale = 2)
    private BigDecimal cost;
    @Column(length = 20)
    private String billingCycle;
    private LocalDate startDate;
    private LocalDate renewalDate;
    @Enumerated(EnumType.STRING)
    @Column(length = 30, nullable = false)
    private SubscriptionStatus status;
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
        if (status == null) status = SubscriptionStatus.ACTIVE;
        if (totalSeats == null) totalSeats = 1;
        if (usedSeats == null) usedSeats = 0;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
