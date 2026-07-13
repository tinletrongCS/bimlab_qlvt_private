package com.bimlab.asset.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record AssetBookingRequest(
        @NotBlank @Size(max = 80) String assetCode,
        @NotBlank @Size(max = 255) String title,
        @Size(max = 1000) String purpose,
        @NotNull LocalDateTime startTime,
        @NotNull LocalDateTime endTime,
        Long requestedByEmployeeId,
        Long departmentId,
        Long siteId,
        Long projectId,
        Boolean autoRelease,
        @Size(max = 1000) String notes,
        @Size(max = 200) String createdBy
) {
}
