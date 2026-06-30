package com.bimlab.asset.dto.request;

import jakarta.validation.constraints.Size;

public record AssetBookingCheckoutRequest(
        @Size(max = 200) String completedBy,
        @Size(max = 1000) String notes
) {
}
