package com.bimlab.asset.model;

import com.bimlab.asset.model.status.QrCodeStatus;
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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "asset_qr_codes", schema = "asset", indexes = {
        @Index(name = "idx_asset_qr_codes_asset_id", columnList = "asset_id"),
        @Index(name = "idx_asset_qr_codes_status", columnList = "status"),
        @Index(name = "idx_asset_qr_codes_qr_token", columnList = "qr_token")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetQrCode {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "asset_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private AssetItem asset;

    @Column(name = "qr_payload", nullable = false, length = 1000)
    private String qrPayload;

    @Column(name = "qr_token", unique = true, length = 120)
    private String qrToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private QrCodeStatus status;

    @Column(name = "printed_at")
    private LocalDateTime printedAt;

    @Column(name = "printed_by", length = 200)
    private String printedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        if (status == null) status = QrCodeStatus.ACTIVE;
    }
}
