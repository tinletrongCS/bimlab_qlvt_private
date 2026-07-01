package com.bimlab.asset.repository;

import com.bimlab.asset.model.AssetItem;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AssetItemRepository extends JpaRepository<AssetItem, Long> {
    Optional<AssetItem> findByAssetCode(String assetCode);

    /**
     * Khoá bi quan hàng asset để serialize việc tạo booking đồng thời trên cùng phòng
     * (chống đặt trùng do race giữa kiểm tra overlap và lưu). Chỉ dùng trong luồng ghi.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from AssetItem a where a.assetCode = :assetCode")
    Optional<AssetItem> findByAssetCodeForUpdate(@Param("assetCode") String assetCode);

    boolean existsByAssetCode(String assetCode);
    List<AssetItem> findByAssetCategoryId(Long categoryId);
    List<AssetItem> findByCatalogItemId(Long catalogItemId);
}
