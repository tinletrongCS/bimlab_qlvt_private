package com.bimlab.asset.repository;

import com.bimlab.asset.model.AssetCodeSequence;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AssetCodeSequenceRepository extends JpaRepository<AssetCodeSequence, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from AssetCodeSequence s where s.categoryId = :categoryId")
    Optional<AssetCodeSequence> findWithLockByCategoryId(@Param("categoryId") Long categoryId);
}
