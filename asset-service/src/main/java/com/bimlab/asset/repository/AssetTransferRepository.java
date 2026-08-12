package com.bimlab.asset.repository;

import com.bimlab.asset.entity.AssetTransfer;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssetTransferRepository extends JpaRepository<AssetTransfer, Long> {
    List<AssetTransfer> findByAssetIdOrderByTransferDateDesc(Long assetId);

    List<AssetTransfer> findByTransferHeaderIdOrderByLineNoAscIdAsc(Long transferHeaderId);

    List<AssetTransfer> findByTransferHeaderIdInOrderByTransferHeaderIdAscLineNoAscIdAsc(List<Long> transferHeaderIds);

    List<AssetTransfer> findByAsset_IdInAndTransferHeader_Status(List<Long> assetIds, String status);

    default List<AssetTransfer> findAllSortedByDateDesc() {
        return findAll(Sort.by(Sort.Direction.DESC, "transferDate", "id"));
    }
}
