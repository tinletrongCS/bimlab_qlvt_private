package com.bimlab.asset.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "vendors", schema = "asset")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Vendor {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 180)
    private String name;
    @Column(length = 80)
    private String taxCode;
    @Column(length = 120)
    private String contactName;
    @Column(length = 120)
    private String email;
    @Column(length = 40)
    private String phone;
    @Column(length = 500)
    private String address;
    @Column(length = 20, nullable = false)
    private String status;
    @Column(nullable = false)
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (status == null || status.isBlank()) status = "ACTIVE";
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
