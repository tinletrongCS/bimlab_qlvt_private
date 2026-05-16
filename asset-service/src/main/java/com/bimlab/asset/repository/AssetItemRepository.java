package com.bimlab.asset.repository;

import com.bimlab.asset.model.AssetItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetItemRepository extends JpaRepository<AssetItem, Long> {}
