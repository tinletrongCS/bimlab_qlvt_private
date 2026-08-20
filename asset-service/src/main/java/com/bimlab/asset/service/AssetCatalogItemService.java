package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.AssetCatalogItemRequest;
import com.bimlab.asset.dto.response.AssetCatalogItemDetailResponse;
import com.bimlab.asset.dto.response.AssetCatalogItemListResponse;
import com.bimlab.asset.entity.AssetCatalogItem;
import com.bimlab.asset.entity.AssetCategory;
import com.bimlab.asset.entity.status.AssetClass;
import com.bimlab.asset.entity.status.CatalogType;
import com.bimlab.asset.repository.AssetCatalogItemRepository;
import com.bimlab.asset.repository.AssetCategoryRepository;
import com.bimlab.asset.repository.AssetItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AssetCatalogItemService {
    private final AssetCatalogItemRepository catalogItems;
    private final AssetCategoryRepository categories;
    private final AssetItemRepository assets;
    /*
    Lấy danh mục theo loại tài sản
    Cho phép nhập từ khóa tìm theo mã và tên
     */
    @Transactional(readOnly = true)
    public Page<AssetCatalogItemListResponse> listCatalogItems(
            String keyword,
            Long categoryId,
            Boolean active,
            Pageable pageable
    ) {
        String keyWord = keyword == null ? "" : keyword.trim();
        Page<AssetCatalogItemListResponse> page = catalogItems.findList(keyWord, categoryId, active, pageable);
        if (page.isEmpty()) {
            return page;
        }

        List<Long> catalogItemIds = page.getContent().stream()
                .map(AssetCatalogItemListResponse::id)
                .toList();
        Map<Long, Long> assetCounts = new HashMap<>();
        for (AssetItemRepository.CatalogAssetCount count : assets.countByCatalogItemIds(catalogItemIds)) {
            assetCounts.put(count.getCatalogItemId(), count.getAssetCount());
        }
        return page.map(item -> item.withAssetCount(assetCounts.getOrDefault(item.id(), 0L)));
    }

    @Transactional(readOnly = true)
    public List<AssetCatalogItemListResponse> listActiveCatalogItemsByCategory(Long categoryId) {
        return catalogItems.findActiveOptions(categoryId);
    }

    @Transactional(readOnly = true)
    public AssetCatalogItemDetailResponse getCatalogItem(Long id) {
        return catalogItems.findDetailById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy danh mục với mã " + id));
    }

    /*
    Tạo một danh mục mới
     */
    @Transactional
    public AssetCatalogItemDetailResponse createCatalogItem(AssetCatalogItemRequest request) {
        AssetCategory category = categories.findById(request.categoryId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy loại tài sản hoặc mã loại không hợp lệ"));
        if (!Boolean.TRUE.equals(category.getActive())) {
            throw new IllegalArgumentException("Loại tài sản với mã " + category.getCode() + " đã ngừng hoạt động");
        }
        CatalogType catalogType = requireMatchingCatalogType(category, request.catalogType());

        AssetCatalogItem catalogItem = AssetCatalogItem.builder()
                .itemCode("TMP-" + UUID.randomUUID())
                .name(request.name().trim())
                .category(category)
                .catalogType(catalogType)
                .inventoryGroup(trimToNull(request.inventoryGroup()))
                .unit(request.unit() == null ? null : request.unit().name())
                .costValue(request.costValue())
                .standardValue(request.standardValue())
                .fixedValue(request.fixedValue())
                .internalValue(request.internalValue())
                .technicalSpec(trimToNull(request.technicalSpec()))
                .active(request.active() == null || request.active())
                .build();
        catalogItems.save(catalogItem);
        catalogItem.setItemCode("CATALOG-%04d".formatted(catalogItem.getId()));
        catalogItems.flush();
        return toDetail(catalogItem);
    }

    @Transactional
    public AssetCatalogItemDetailResponse updateCatalogItem(Long id, AssetCatalogItemRequest request) {
        AssetCatalogItem catalogItem = catalogItems.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy danh mục với mã " + id));

        // lấy mã của loại tài sản mà danh mục này đang thuộc về
        Long currentCategoryId = catalogItem.getCategory() == null ? null : catalogItem.getCategory().getId();
        // categoryId trong request không khớp với id của bất kỳ id của category nào trong hệ thống
        AssetCategory category = categories.findById(request.categoryId())
                .orElseThrow(() -> new NoSuchElementException("Loại tài sản với mã " + request.categoryId() + " không tồn tại hoặc không hợp lệ"));
        boolean hasChanged = !Objects.equals(currentCategoryId, request.categoryId());
        if (hasChanged && !Boolean.TRUE.equals(category.getActive())) {
            throw new IllegalArgumentException("Loại tài sản đã ngừng hoạt động");
        }

        // Tìm xem đã có tài sản nào được gán vào danh mục này chưa
        if (hasChanged && assets.existsByCatalogItemId(id)) {
            throw new IllegalArgumentException("Không được thay đổi danh mục do đã có tài sản dùng danh mục này");
        }
        CatalogType catalogType = requireMatchingCatalogType(category, request.catalogType());
        catalogItem.setName(request.name().trim());
        catalogItem.setCategory(category);
        catalogItem.setCatalogType(catalogType);
        catalogItem.setInventoryGroup(trimToNull(request.inventoryGroup()));
        catalogItem.setUnit(request.unit() == null ? null : request.unit().name());
        catalogItem.setCostValue(request.costValue());
        catalogItem.setStandardValue(request.standardValue());
        catalogItem.setFixedValue(request.fixedValue());
        catalogItem.setInternalValue(request.internalValue());
        catalogItem.setTechnicalSpec(trimToNull(request.technicalSpec()));
        if (request.active() != null) {
            catalogItem.setActive(request.active());
        }
        catalogItems.flush(); // Chạy UPDATE và @PreUpdate
        return toDetail(catalogItem);
    }

    @Transactional
    public void deactivateCatalogItem(Long id) {
        AssetCatalogItem catalogItem = catalogItems.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy danh mục với mã " + id));
        catalogItem.setActive(false);
        catalogItems.save(catalogItem);
    }

    private AssetCatalogItemDetailResponse toDetail(AssetCatalogItem item) {
        AssetCategory category = item.getCategory();
        return new AssetCatalogItemDetailResponse(
                item.getId(),
                item.getItemCode(),
                item.getName(),
                item.getCatalogType(),
                category.getId(),
                category.getCode(),
                category.getName(),
                item.getInventoryGroup(),
                item.getUnit(),
                item.getCostValue(),
                item.getStandardValue(),
                item.getFixedValue(),
                item.getInternalValue(),
                item.getTechnicalSpec(),
                item.getActive(),
                item.getCreatedAt(),
                item.getUpdatedAt()
        );
    }

    private void isValidCategory(AssetCategory category) {
        categories.findById(category.getId())
                .orElseThrow(() -> new NoSuchElementException("Loại tài sản với mã " + category.getId() + " không tồn tại hoặc không hợp lệ"));
        if (!Boolean.TRUE.equals(category.getActive())) {
            throw new IllegalArgumentException("Loại tài sản đã ngừng hoạt động");
        }
    }
    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private CatalogType requireMatchingCatalogType(AssetCategory category, CatalogType requestedType) {
        CatalogType expectedType = category.getAssetClass() == AssetClass.TOOL_EQUIPMENT
                ? CatalogType.TOOL
                : CatalogType.ASSET;
        if (requestedType != expectedType) {
            throw new IllegalArgumentException(
                    "Kiểu danh mục phải phù hợp với nhóm quản lý của loại tài sản"
            );
        }
        return expectedType;
    }
}
