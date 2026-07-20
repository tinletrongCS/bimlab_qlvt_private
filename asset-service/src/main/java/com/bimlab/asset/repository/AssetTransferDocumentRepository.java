package com.bimlab.asset.repository;

import com.bimlab.asset.model.AssetTransferDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssetTransferDocumentRepository extends JpaRepository<AssetTransferDocument, Long> {
    List<AssetTransferDocument> findByTransferHeaderIdOrderByIdAsc(Long transferHeaderId);

    List<AssetTransferDocument> findByTransferHeaderIdInOrderByTransferHeaderIdAscIdAsc(List<Long> transferHeaderIds);
}
