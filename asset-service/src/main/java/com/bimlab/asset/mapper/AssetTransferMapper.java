package com.bimlab.asset.mapper;

import com.bimlab.asset.dto.response.AssetDocumentSummaryResponse;
import com.bimlab.asset.dto.response.AssetTransferResponse;
import com.bimlab.asset.model.AssetDocument;
import com.bimlab.asset.model.AssetTransfer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AssetTransferMapper {
    private final AssetMapper assetMapper;

    public AssetTransferResponse toResponse(AssetTransfer transfer) {
        return new AssetTransferResponse(
                transfer.getId(),
                transfer.getAsset() == null ? null : assetMapper.toResponse(transfer.getAsset()),
                transfer.getTransferType(),
                transfer.getFromEmployeeId(),
                transfer.getToEmployeeId(),
                transfer.getFromDepartmentId(),
                transfer.getToDepartmentId(),
                transfer.getFromSiteId(),
                transfer.getToSiteId(),
                transfer.getFromProjectId(),
                transfer.getToProjectId(),
                transfer.getTransferDate(),
                transfer.getConditionBefore(),
                transfer.getConditionAfter(),
                transfer.getReason(),
                transfer.getPerformedBy(),
                transfer.getHandoverDocumentUrl(),
                toDocumentSummary(transfer.getHandoverDocument()),
                transfer.getApprovedBy(),
                transfer.getCreatedAt()
        );
    }

    private AssetDocumentSummaryResponse toDocumentSummary(AssetDocument document) {
        if (document == null) return null;
        return new AssetDocumentSummaryResponse(
                document.getId(),
                document.getDocumentType() == null ? null : document.getDocumentType().name(),
                document.getFileName(),
                document.getObjectKey()
        );
    }
}
