package com.bimlab.asset.repository;

import com.bimlab.asset.model.AssetBookingSession;
import com.bimlab.asset.model.status.AssetBookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AssetBookingSessionRepository extends JpaRepository<AssetBookingSession, Long> {
    List<AssetBookingSession> findByAssetIdOrderByStartTimeDesc(Long assetId);

    List<AssetBookingSession> findByStatusOrderByStartTimeAsc(AssetBookingStatus status);

    @Query("""
            select b from AssetBookingSession b
            where (:assetId is null or b.asset.id = :assetId)
              and (:status is null or b.status = :status)
              and (:fromTime is null or b.endTime >= :fromTime)
              and (:toTime is null or b.startTime <= :toTime)
            order by b.startTime desc
            """)
    List<AssetBookingSession> searchBookings(
            @Param("assetId") Long assetId,
            @Param("status") AssetBookingStatus status,
            @Param("fromTime") LocalDateTime fromTime,
            @Param("toTime") LocalDateTime toTime
    );

    @Query("""
            select b from AssetBookingSession b
            where b.asset.id = :assetId
              and b.status in :statuses
              and b.startTime < :endTime
              and b.endTime > :startTime
            order by b.startTime asc
            """)
    List<AssetBookingSession> findOverlappingBookings(
            @Param("assetId") Long assetId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            @Param("statuses") List<AssetBookingStatus> statuses
    );

    @Query("""
            select b from AssetBookingSession b
            where b.status = :status
              and b.autoRelease = true
              and b.endTime <= :now
            order by b.endTime asc
            """)
    List<AssetBookingSession> findAutoReleaseDue(
            @Param("status") AssetBookingStatus status,
            @Param("now") LocalDateTime now
    );
}
