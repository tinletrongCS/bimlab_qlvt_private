package com.bimlab.asset.repository;

import com.bimlab.asset.model.AssetQrCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssetQrCodeRepository extends JpaRepository<AssetQrCode, Long> {
    List<AssetQrCode> findByAssetIdOrderByCreatedAtDesc(Long assetId);
    Optional<AssetQrCode> findByQrToken(String qrToken);
}
