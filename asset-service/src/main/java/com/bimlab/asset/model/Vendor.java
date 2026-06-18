package com.bimlab.asset.model;

import jakarta.persistence.*;
import com.bimlab.asset.model.status.VendorStatus;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "vendors", schema = "asset", indexes = {
        @Index(name = "idx_vendors_name", columnList = "name"),
        @Index(name = "idx_vendors_status", columnList = "status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Vendor {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 180)
    private String name;
    @Column(name = "tax_code", unique = true, length = 80)
    private String taxCode;
    @Column(name = "contact_name", length = 120)
    private String contactName;
    @Column(length = 120)
    private String email;
    @Column(length = 40)
    private String phone;
    @Column(length = 500)
    private String address;
    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private VendorStatus status;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (status == null) status = VendorStatus.ACTIVE;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
