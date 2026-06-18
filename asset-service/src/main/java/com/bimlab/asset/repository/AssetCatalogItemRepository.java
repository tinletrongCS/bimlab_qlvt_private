package com.bimlab.asset.repository;

import com.bimlab.asset.model.AssetCatalogItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssetCatalogItemRepository extends JpaRepository<AssetCatalogItem, Long> {
    Optional<AssetCatalogItem> findByItemCode(String itemCode);
    List<AssetCatalogItem> findByActiveTrueOrderByNameAsc();
}
