package com.bimlab.asset.mapper;

import com.bimlab.asset.dto.response.AssetSummaryResponse;
import com.bimlab.asset.dto.response.SubscriptionResponse;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.Subscription;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SubscriptionMapper {
    private final VendorMapper vendorMapper;

    public SubscriptionResponse toResponse(Subscription subscription) {
        return new SubscriptionResponse(
                subscription.getId(),
                toAssetSummary(subscription.getAsset()),
                subscription.getSoftwareName(),
                subscription.getPlanName(),
                subscription.getLicenseKey(),
                subscription.getOwnerEmployeeId(),
                vendorMapper.toResponse(subscription.getVendor()),
                subscription.getTotalSeats(),
                subscription.getUsedSeats(),
                subscription.getCost(),
                subscription.getBillingCycle(),
                subscription.getStartDate(),
                subscription.getRenewalDate(),
                enumName(subscription.getStatus()),
                subscription.getNotes(),
                subscription.getCreatedAt(),
                subscription.getUpdatedAt()
        );
    }

    private AssetSummaryResponse toAssetSummary(AssetItem asset) {
        if (asset == null) return null;
        return new AssetSummaryResponse(asset.getId(), asset.getAssetCode(), asset.getName());
    }

    private String enumName(Enum<?> value) {
        return value == null ? null : value.name();
    }
}
