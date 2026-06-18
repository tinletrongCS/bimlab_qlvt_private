package com.bimlab.asset.mapper;

import com.bimlab.asset.dto.response.VendorResponse;
import com.bimlab.asset.model.Vendor;
import org.springframework.stereotype.Component;

@Component
public class VendorMapper {

    public VendorResponse toResponse(Vendor vendor) {
        if (vendor == null) return null;
        return new VendorResponse(
                vendor.getId(),
                vendor.getName(),
                vendor.getTaxCode(),
                vendor.getContactName(),
                vendor.getEmail(),
                vendor.getPhone(),
                vendor.getAddress(),
                vendor.getStatus() == null ? null : vendor.getStatus().name()
        );
    }
}
