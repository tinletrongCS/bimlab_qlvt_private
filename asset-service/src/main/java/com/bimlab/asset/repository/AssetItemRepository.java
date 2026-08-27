package com.bimlab.asset.repository;

import com.bimlab.asset.entity.AssetItem;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
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
    boolean existsByCatalogItemId(Long catalogItemId);
    long countByCatalogItemId(Long catalogItemId);
    List<AssetItem> findByAssetCategoryId(Long categoryId);
    List<AssetItem> findByCatalogItemId(Long catalogItemId);

    @Query("""
            select asset.catalogItem.id as catalogItemId, count(asset.id) as assetCount
            from AssetItem asset
            where asset.catalogItem.id in :catalogItemIds
            group by asset.catalogItem.id
            """)
    List<CatalogAssetCount> countByCatalogItemIds(@Param("catalogItemIds") Collection<Long> catalogItemIds);

    interface CatalogAssetCount {
        Long getCatalogItemId();
        Long getAssetCount();
    }
}
