package com.bimlab.asset.repository;

import com.bimlab.asset.entity.Vendor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VendorRepository extends JpaRepository<Vendor, Long> {
    List<Vendor> findAllByOrderByNameAsc();
    boolean existsByTaxCodeIgnoreCase(String taxCode);

    boolean existsByTaxCodeIgnoreCaseAndIdNot(String taxCode, Long id);
}
