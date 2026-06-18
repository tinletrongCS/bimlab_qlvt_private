package com.bimlab.asset.mapper;

import com.bimlab.asset.dto.response.MaintenanceRecordResponse;
import com.bimlab.asset.model.MaintenanceRecord;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MaintenanceRecordMapper {
    private final AssetMapper assetMapper;
    private final VendorMapper vendorMapper;

    public MaintenanceRecordResponse toResponse(MaintenanceRecord record) {
        return new MaintenanceRecordResponse(
                record.getId(),
                record.getAsset() == null ? null : assetMapper.toResponse(record.getAsset()),
                record.getMaintenanceType(),
                record.getMaintenanceDate(),
                record.getCost(),
                vendorMapper.toResponse(record.getVendor()),
                record.getPerformedBy(),
                record.getDescription(),
                record.getNextMaintenanceDate(),
                record.getDowntimeHours(),
                record.getMeterReading(),
                record.getConditionAfter(),
                record.getStatus() == null ? null : record.getStatus().name(),
                record.getCreatedAt(),
                record.getUpdatedAt()
        );
    }
}
