package com.bimlab.asset.repository;

import com.bimlab.asset.model.AssetCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssetCategoryRepository extends JpaRepository<AssetCategory, Long> {
    Optional<AssetCategory> findByCode(String code);
    List<AssetCategory> findByActiveTrueOrderByNameAsc();
    List<AssetCategory> findAllByOrderByNameAsc();
    List<AssetCategory> findByParentIdOrderByNameAsc(Long parentId);
    boolean existsByCode(String code);
    boolean existsByParentId(Long parentId);
}
