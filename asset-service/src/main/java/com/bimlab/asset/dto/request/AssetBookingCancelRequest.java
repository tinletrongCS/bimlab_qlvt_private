package com.bimlab.asset.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AssetBookingCancelRequest(
        @NotBlank @Size(max = 200) String cancelledBy,
        @NotBlank @Size(max = 1000) String cancelReason
) {
}
