package com.bimlab.asset.repository;

import com.bimlab.asset.model.AssetItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssetItemRepository extends JpaRepository<AssetItem, Long> {
    Optional<AssetItem> findByAssetCode(String assetCode);
    boolean existsByAssetCode(String assetCode);
    List<AssetItem> findByAssetCategoryId(Long categoryId);
    List<AssetItem> findByCatalogItemId(Long catalogItemId);
}
