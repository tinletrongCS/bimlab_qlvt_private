package com.bimlab.asset.dto.request;

import jakarta.validation.constraints.NotBlank;

public record VendorRequest(
        @NotBlank String name,
        String taxCode,
        String contactName,
        String email,
        String phone,
        String address,
        String website,
        String bankName,
        String bankAccountNumber,
        String status
) {
    public VendorRequest(
            String name,
            String taxCode,
            String contactName,
            String email,
            String phone,
            String address,
            String status
    ) {
        this(name, taxCode, contactName, email, phone, address, null, null, null, status);
    }
}
