package com.bimlab.asset.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.bimlab.asset.entity.AssetTransferConfirmation;

public interface AssetTransferConfirmationRepository
        extends JpaRepository<AssetTransferConfirmation, Long> {
    List<AssetTransferConfirmation> findByTransferHeaderIdOrderByIdAsc(Long transferHeaderId);

    List<AssetTransferConfirmation> findByTransferHeaderIdInOrderByTransferHeaderIdAscIdAsc(List<Long> transferHeaderIds);
}
