package com.bimlab.asset.dto.response;

import com.bimlab.asset.model.status.AssetBookingStatus;

import java.time.LocalDateTime;

public record AssetBookingResponse(
        Long id,
        Long assetId,
        String assetCode,
        String assetName,
        String bookingCode,
        String title,
        String purpose,
        LocalDateTime startTime,
        LocalDateTime endTime,
        Long requestedByEmployeeId,
        Long departmentId,
        Long siteId,
        Long projectId,
        AssetBookingStatus status,
        Boolean autoRelease,
        LocalDateTime checkedInAt,
        LocalDateTime checkedOutAt,
        String approvedBy,
        String cancelledBy,
        LocalDateTime cancelledAt,
        String cancelReason,
        String notes,
        String createdBy,
        String updatedBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
