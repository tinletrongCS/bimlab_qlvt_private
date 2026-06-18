package com.bimlab.asset.dto.response;

public record VendorResponse(
        Long id,
        String name,
        String taxCode,
        String contactName,
        String email,
        String phone,
        String address,
        String status
) {}
