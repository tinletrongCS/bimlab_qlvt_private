package com.bimlab.asset.repository;

import com.bimlab.asset.model.AssetDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssetDocumentRepository extends JpaRepository<AssetDocument, Long> {
    List<AssetDocument> findByAssetIdOrderByCreatedAtDesc(Long assetId);
    Optional<AssetDocument> findByObjectKey(String objectKey);
}
