package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.VendorRequest;
import com.bimlab.asset.entity.Vendor;
import com.bimlab.asset.entity.status.StatusParser;
import com.bimlab.asset.entity.status.VendorStatus;
import com.bimlab.asset.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class VendorService {
    private final VendorRepository vendorRepository;
    @Transactional(readOnly = true)
    public List<Vendor> listVendors() {
        return vendorRepository.findAllByOrderByNameAsc();
    }


    @Transactional(readOnly = true)
    public Page<Vendor> listVendorsPaged(Pageable pageable) {
        return vendorRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Vendor getVendor(Long id) {
        return vendorRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Không tìm thấy nhà cung cấp với id " + id));
    }

    @Transactional
    public Vendor createVendor(VendorRequest req) {
        String name = trimToNull(req.name());
        if (name == null) throw new IllegalArgumentException("Tên nhà cung cấp không được để trống");

        String taxCode = trimToNull(req.taxCode());
        if (taxCode != null && vendorRepository.existsByTaxCodeIgnoreCase(taxCode)) {
            throw new IllegalArgumentException("Nhà cung cấp với mã số thuế " + taxCode + " đã tồn tại");
        }

        VendorStatus status = StatusParser.parseOrNull(VendorStatus.class, req.status());
        if (status == null) status = VendorStatus.ACTIVE;

        return vendorRepository.save(Vendor.builder()
                .name(name)
                .taxCode(taxCode)
                .contactName(trimToNull(req.contactName()))
                .email(trimToNull(req.email()))
                .phone(trimToNull(req.phone()))
                .address(trimToNull(req.address()))
                .website(trimToNull(req.website()))
                .bankName(trimToNull(req.bankName()))
                .bankAccountNumber(trimToNull(req.bankAccountNumber()))
                .status(status)
                .build());
    }

    @Transactional
    public Vendor updateVendor(Long id, VendorRequest req) {
        Vendor vendor = this.getVendor(id);

        // Check mã số thuế trùng
        String taxCode = req.taxCode() == null ? null : req.taxCode();
        // mã số thuế đã được sử dụng
        if (taxCode != null && !taxCode.isEmpty() && vendorRepository.existsByTaxCodeIgnoreCaseAndIdNot(taxCode, id)) {
            throw new IllegalArgumentException("Mã số thuế đã được sử dụng");
        }
        VendorStatus status = StatusParser.parseOrNull(VendorStatus.class, req.status());
        if (status == null) {
            throw new IllegalArgumentException("Trạng thái nhà cung cấp không hợp lệ");
        }
        vendor.setName(req.name().trim());
        vendor.setTaxCode(taxCode);
        vendor.setContactName(req.contactName());
        vendor.setEmail(req.email());
        vendor.setPhone(req.phone());
        vendor.setAddress(req.address());
        vendor.setWebsite(req.website());
        vendor.setBankName(req.bankName());
        vendor.setBankAccountNumber(req.bankAccountNumber());
        vendor.setStatus(status);

        return vendorRepository.save(vendor);
    }

    @Transactional
    public void deactiveVendor(Long id) {
        Vendor currentVendor = this.getVendor(id);
        currentVendor.setStatus(VendorStatus.INACTIVE);
        vendorRepository.save(currentVendor);
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
