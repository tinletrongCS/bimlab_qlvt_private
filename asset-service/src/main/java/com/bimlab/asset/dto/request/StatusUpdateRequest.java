package com.bimlab.asset.dto.request;

import jakarta.validation.constraints.NotBlank;

public record StatusUpdateRequest(
        @NotBlank String status
) {}
