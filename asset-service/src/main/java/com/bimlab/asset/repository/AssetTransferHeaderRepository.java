package com.bimlab.asset.repository;

import com.bimlab.asset.model.AssetTransferHeader;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssetTransferHeaderRepository extends JpaRepository<AssetTransferHeader, Long> {
    boolean existsByTransferCode(String transferCode);

    List<AssetTransferHeader> findAllByOrderByUpdatedAtDescIdDesc();
}
