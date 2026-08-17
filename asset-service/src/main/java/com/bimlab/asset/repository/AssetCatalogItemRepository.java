package com.bimlab.asset.repository;

import com.bimlab.asset.dto.response.AssetCatalogItemDetailResponse;
import com.bimlab.asset.dto.response.AssetCatalogItemListResponse;
import com.bimlab.asset.entity.AssetCatalogItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AssetCatalogItemRepository extends JpaRepository<AssetCatalogItem, Long> {
    Optional<AssetCatalogItem> findByItemCode(String itemCode);
    boolean existsByItemCodeIgnoreCase(String itemCode);
    boolean existsByItemCodeIgnoreCaseAndIdNot(String itemCode, Long id);
    List<AssetCatalogItem> findByActiveTrueOrderByNameAsc();
    boolean existsByCategoryId(Long categoryId);

    @Query(value = """
            select new com.bimlab.asset.dto.response.AssetCatalogItemListResponse(
                item.id, item.itemCode, item.name, item.catalogType,
                category.id, category.code, category.name, item.unit, item.active
            )
            from AssetCatalogItem item
            join item.category category
            where (lower(item.itemCode) like lower(concat('%', :keyword, '%'))
                or lower(item.name) like lower(concat('%', :keyword, '%')))
              and (:categoryId is null or category.id = :categoryId)
              and (:active is null or item.active = :active)
            """,
            countQuery = """
            select count(item)
            from AssetCatalogItem item
            join item.category category
            where (lower(item.itemCode) like lower(concat('%', :keyword, '%'))
                or lower(item.name) like lower(concat('%', :keyword, '%')))
              and (:categoryId is null or category.id = :categoryId)
              and (:active is null or item.active = :active)
            """)
    Page<AssetCatalogItemListResponse> findList(
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("active") Boolean active,
            Pageable pageable
    );

    // Dùng projection
    @Query("""
            select new com.bimlab.asset.dto.response.AssetCatalogItemListResponse(
                item.id, item.itemCode, item.name, item.catalogType,
                category.id, category.code, category.name, item.unit, item.active
            )
            from AssetCatalogItem item
            join item.category category
            where item.active = true
              and (:categoryId is null or category.id = :categoryId)
            order by item.name
            """)
    List<AssetCatalogItemListResponse> findActiveOptions(@Param("categoryId") Long categoryId);
    // Dùng projection
    @Query("""
            select new com.bimlab.asset.dto.response.AssetCatalogItemDetailResponse(
                item.id, item.itemCode, item.name, item.catalogType,
                category.id, category.code, category.name,
                item.inventoryGroup, item.unit, item.costValue, item.standardValue,
                item.fixedValue, item.internalValue, item.technicalSpec, item.active,
                item.createdAt, item.updatedAt
            )
            from AssetCatalogItem item
            join item.category category
            where item.id = :id
            """)
    Optional<AssetCatalogItemDetailResponse> findDetailById(@Param("id") Long id);
}
