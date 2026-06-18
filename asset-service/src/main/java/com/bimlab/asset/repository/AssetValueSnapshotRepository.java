package com.bimlab.asset.repository;

import com.bimlab.asset.model.AssetValueSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssetValueSnapshotRepository extends JpaRepository<AssetValueSnapshot, Long> {
    List<AssetValueSnapshot> findByAssetIdOrderBySnapshotDateDesc(Long assetId);
}
