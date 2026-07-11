package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.MaintenanceRecordRequest;
import com.bimlab.asset.model.MaintenanceRecord;
import com.bimlab.asset.model.status.MaintenanceStatus;
import com.bimlab.asset.model.status.StatusParser;
import com.bimlab.asset.repository.MaintenanceRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class MaintenanceService {
    private final MaintenanceRecordRepository maintenanceRecords;
    private final AssetService assetService;
    private final VendorService vendorService;

    @Transactional(readOnly = true)
    public List<MaintenanceRecord> listMaintenanceRecords() {
        return maintenanceRecords.findAll();
    }


    @Transactional(readOnly = true)
    public Page<MaintenanceRecord> listMaintenanceRecordsPaged(Pageable pageable) {
        return maintenanceRecords.findAll(pageable);
    }
    @Transactional(readOnly = true)
    public List<MaintenanceRecord> listMaintenanceByAsset(Long assetId) {
        return maintenanceRecords.findByAssetIdOrderByMaintenanceDateDesc(assetId);
    }

    @Transactional(readOnly = true)
    public MaintenanceRecord getMaintenanceRecord(Long id) {
        return maintenanceRecords.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Bản ghi bảo trì không tồn tại"));
    }

    @Transactional
    public MaintenanceRecord createMaintenanceRecord(MaintenanceRecordRequest req) {
        MaintenanceRecord m = new MaintenanceRecord();
        applyMaintenanceRecord(m, req);
        return maintenanceRecords.save(m);
    }

    @Transactional
    public MaintenanceRecord updateMaintenanceRecord(Long id, MaintenanceRecordRequest req) {
        MaintenanceRecord m = getMaintenanceRecord(id);
        applyMaintenanceRecord(m, req);
        return maintenanceRecords.save(m);
    }

    @Transactional
    public void deleteMaintenanceRecord(Long id) {
        maintenanceRecords.delete(getMaintenanceRecord(id));
    }

    private void applyMaintenanceRecord(MaintenanceRecord m, MaintenanceRecordRequest req) {
        m.setAsset(assetService.getAsset(req.assetId()));
        m.setMaintenanceType(req.maintenanceType());
        m.setMaintenanceDate(req.maintenanceDate());
        m.setCost(req.cost());
        m.setVendor(req.vendorId() == null ? null : vendorService.getVendor(req.vendorId()));
        m.setPerformedBy(req.performedBy());
        m.setDescription(req.description());
        m.setNextMaintenanceDate(req.nextMaintenanceDate());
        m.setDowntimeHours(req.downtimeHours());
        m.setMeterReading(req.meterReading());
        m.setConditionAfter(req.conditionAfter());
        MaintenanceStatus parsed = StatusParser.parseOrNull(MaintenanceStatus.class, req.status());
        if (parsed != null) m.setStatus(parsed);
    }
}
