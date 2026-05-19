package com.bimlab.asset.repository;

import com.bimlab.asset.model.AssetTransfer;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssetTransferRepository extends JpaRepository<AssetTransfer, Long> {
    List<AssetTransfer> findByAssetIdOrderByTransferDateDesc(Long assetId);

    default List<AssetTransfer> findAllSortedByDateDesc() {
        return findAll(Sort.by(Sort.Direction.DESC, "transferDate", "id"));
    }
}
