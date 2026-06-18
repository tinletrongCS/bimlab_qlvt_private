package com.bimlab.asset.mapper;

import com.bimlab.asset.dto.response.AssetSummaryResponse;
import com.bimlab.asset.dto.response.ContractResponse;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.Contract;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ContractMapper {
    private final VendorMapper vendorMapper;
    private final PurchaseRequestMapper purchaseRequestMapper;

    public ContractResponse toResponse(Contract contract) {
        return new ContractResponse(
                contract.getId(),
                contract.getContractNumber(),
                contract.getTitle(),
                vendorMapper.toResponse(contract.getVendor()),
                purchaseRequestMapper.toResponse(contract.getPurchaseRequest()),
                toAssetSummary(contract.getAsset()),
                contract.getSignDate(),
                contract.getEffectiveFrom(),
                contract.getEffectiveTo(),
                contract.getContractValue(),
                contract.getCurrency(),
                contract.getPaymentTerms(),
                contract.getStatus() == null ? null : contract.getStatus().name(),
                contract.getAttachmentUrl(),
                contract.getAttachmentObjectKey(),
                contract.getDocument() == null ? null : contract.getDocument().getId(),
                contract.getNotes(),
                contract.getCreatedAt(),
                contract.getUpdatedAt()
        );
    }

    private AssetSummaryResponse toAssetSummary(AssetItem asset) {
        if (asset == null) return null;
        return new AssetSummaryResponse(asset.getId(), asset.getAssetCode(), asset.getName());
    }
}
