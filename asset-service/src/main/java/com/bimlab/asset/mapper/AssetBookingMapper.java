package com.bimlab.asset.mapper;

import com.bimlab.asset.dto.response.AssetBookingResponse;
import com.bimlab.asset.model.AssetBookingSession;
import com.bimlab.asset.model.AssetItem;
import org.springframework.stereotype.Component;

@Component
public class AssetBookingMapper {
    public AssetBookingResponse toResponse(AssetBookingSession booking) {
        AssetItem asset = booking.getAsset();
        return new AssetBookingResponse(
                booking.getId(),
                asset == null ? null : asset.getId(),
                asset == null ? null : asset.getAssetCode(),
                asset == null ? null : asset.getName(),
                booking.getBookingCode(),
                booking.getTitle(),
                booking.getPurpose(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getRequestedByEmployeeId(),
                booking.getDepartmentId(),
                booking.getSiteId(),
                booking.getProjectId(),
                booking.getStatus(),
                booking.getAutoRelease(),
                booking.getCheckedInAt(),
                booking.getCheckedOutAt(),
                booking.getApprovedBy(),
                booking.getCancelledBy(),
                booking.getCancelledAt(),
                booking.getCancelReason(),
                booking.getNotes(),
                booking.getCreatedBy(),
                booking.getUpdatedBy(),
                booking.getCreatedAt(),
                booking.getUpdatedAt()
        );
    }
}
