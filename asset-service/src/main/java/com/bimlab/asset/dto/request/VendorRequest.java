package com.bimlab.asset.dto.request;

import jakarta.validation.constraints.NotBlank;

public record VendorRequest(
        @NotBlank String name,
        String taxCode,
        String contactName,
        String email,
        String phone,
        String address,
        String status
) {}
