package com.bimlab.asset.service;

import com.bimlab.asset.dto.VendorRequest;
import com.bimlab.asset.model.Vendor;
import com.bimlab.asset.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

/**
 * Q2: Vendor domain split from the original {@code AssetManagementService}
 * god-service. Owns Vendor CRUD. {@link #getVendor(Long)} is intentionally
 * public — it is consumed as a cross-domain resolver by
 * {@link SubscriptionService}, {@link ContractService},
 * {@link MaintenanceService}, and {@link AssetService}.
 */
@Service
@RequiredArgsConstructor
public class VendorService {
    private final VendorRepository vendors;

    @Transactional(readOnly = true)
    public List<Vendor> listVendors() {
        return vendors.findAll();
    }

    @Transactional(readOnly = true)
    public Vendor getVendor(Long id) {
        return vendors.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Nhà cung cấp không tồn tại"));
    }

    @Transactional
    public Vendor createVendor(VendorRequest req) {
        return vendors.save(Vendor.builder()
                .name(req.name())
                .taxCode(req.taxCode())
                .contactName(req.contactName())
                .email(req.email())
                .phone(req.phone())
                .address(req.address())
                .status(req.status())
                .build());
    }

    @Transactional
    public Vendor updateVendor(Long id, VendorRequest req) {
        Vendor v = getVendor(id);
        v.setName(req.name());
        v.setTaxCode(req.taxCode());
        v.setContactName(req.contactName());
        v.setEmail(req.email());
        v.setPhone(req.phone());
        v.setAddress(req.address());
        if (req.status() != null) v.setStatus(req.status());
        return vendors.save(v);
    }

    @Transactional
    public void deleteVendor(Long id) {
        vendors.delete(getVendor(id));
    }
}
