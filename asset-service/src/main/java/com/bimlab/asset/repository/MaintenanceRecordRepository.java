package com.bimlab.asset.repository;

import com.bimlab.asset.entity.MaintenanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MaintenanceRecordRepository extends JpaRepository<MaintenanceRecord, Long> {
    List<MaintenanceRecord> findByAssetIdOrderByMaintenanceDateDesc(Long assetId);
}
