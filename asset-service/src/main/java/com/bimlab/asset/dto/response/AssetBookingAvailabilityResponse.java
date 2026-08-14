package com.bimlab.asset.dto.response;

import java.time.LocalDateTime;

public record AssetBookingAvailabilityResponse(
        Long assetId,
        String assetCode,
        LocalDateTime startTime,
        LocalDateTime endTime,
        boolean available,
        String reason,
        Long conflictingBookingId,
        String conflictingBookingCode
) {
}
