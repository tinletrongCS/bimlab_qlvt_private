package com.bimlab.asset.model;

import com.bimlab.asset.model.status.AssetBookingStatus;
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

import java.time.LocalDateTime;

@Entity
@Table(name = "asset_booking_sessions", schema = "asset", indexes = {
        @Index(name = "idx_asset_booking_sessions_asset_id", columnList = "asset_id"),
        @Index(name = "idx_asset_booking_sessions_time", columnList = "start_time, end_time"),
        @Index(name = "idx_asset_booking_sessions_status", columnList = "status"),
        @Index(name = "idx_asset_booking_sessions_requested_by", columnList = "requested_by_employee_id"),
        @Index(name = "idx_asset_booking_sessions_department", columnList = "department_id"),
        @Index(name = "idx_asset_booking_sessions_site", columnList = "site_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetBookingSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "asset_id", nullable = false)
    @JsonIgnoreProperties({"catalogItem", "assetCategory", "parentAsset", "vendor", "hibernateLazyInitializer", "handler"})
    private AssetItem asset;

    @Column(name = "booking_code", nullable = false, unique = true, length = 80)
    private String bookingCode;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(length = 1000)
    private String purpose;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(name = "requested_by_employee_id")
    private Long requestedByEmployeeId;

    @Column(name = "department_id")
    private Long departmentId;

    @Column(name = "site_id")
    private Long siteId;

    @Column(name = "project_id")
    private Long projectId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AssetBookingStatus status;

    @Column(name = "auto_release", nullable = false)
    private Boolean autoRelease;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    @Column(name = "checked_out_at")
    private LocalDateTime checkedOutAt;

    @Column(name = "approved_by", length = 200)
    private String approvedBy;

    @Column(name = "cancelled_by", length = 200)
    private String cancelledBy;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancel_reason", length = 1000)
    private String cancelReason;

    @Column(length = 1000)
    private String notes;

    @Column(name = "created_by", length = 200)
    private String createdBy;

    @Column(name = "updated_by", length = 200)
    private String updatedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (status == null) status = AssetBookingStatus.CONFIRMED;
        if (autoRelease == null) autoRelease = Boolean.TRUE;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
