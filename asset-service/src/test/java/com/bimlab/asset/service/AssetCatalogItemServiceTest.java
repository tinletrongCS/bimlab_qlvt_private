package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.AssetCatalogItemRequest;
import com.bimlab.asset.dto.request.AssetCatalogUnassignmentRequest;
import com.bimlab.asset.dto.response.AssetCatalogItemDetailResponse;
import com.bimlab.asset.entity.AssetCatalogItem;
import com.bimlab.asset.entity.AssetCategory;
import com.bimlab.asset.entity.AssetItem;
import com.bimlab.asset.entity.status.AssetClass;
import com.bimlab.asset.entity.status.CatalogType;
import com.bimlab.asset.entity.status.CatalogUnit;
import com.bimlab.asset.repository.AssetCatalogItemRepository;
import com.bimlab.asset.repository.AssetCategoryRepository;
import com.bimlab.asset.repository.AssetItemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class AssetCatalogItemServiceTest {
    @Mock AssetCatalogItemRepository catalogItems;
    @Mock AssetCategoryRepository categories;
    @Mock AssetItemRepository assets;

    @InjectMocks AssetCatalogItemService service;

    @Test
    void listUsesEmptyTextInsteadOfUntypedNullKeyword() {
        PageRequest pageable = PageRequest.of(0, 20);
        when(catalogItems.findList(any(), any(), any(), any())).thenReturn(Page.empty(pageable));

        service.listCatalogItems(null, null, null, pageable);

        ArgumentCaptor<String> keyword = ArgumentCaptor.forClass(String.class);
        verify(catalogItems).findList(keyword.capture(), any(), any(), any());
        assertEquals("", keyword.getValue());
    }

    @Test
    void createNormalizesAndMapsCatalogItem() {
        AssetCategory category = category(true);
        when(categories.findById(10L)).thenReturn(Optional.of(category));
        when(catalogItems.save(any())).thenAnswer(invocation -> {
            AssetCatalogItem item = invocation.getArgument(0);
            item.setId(1L);
            return item;
        });

        AssetCatalogItemDetailResponse result = service.createCatalogItem(request());

        assertEquals("CATALOG-0001", result.itemCode());
        assertEquals("MONITOR", result.categoryCode());
        assertEquals("CAI", result.unit());
    }

    @Test
    void createRejectsInactiveCategory() {
        when(categories.findById(10L)).thenReturn(Optional.of(category(false)));

        assertThrows(IllegalArgumentException.class, () -> service.createCatalogItem(request()));
    }

    @Test
    void updateChangesManagedCatalogWithoutSavingAgain() {
        AssetCatalogItem item = catalogItem(category(true));
        when(catalogItems.findById(1L)).thenReturn(Optional.of(item));
        when(categories.findById(10L)).thenReturn(Optional.of(category(true)));

        AssetCatalogItemDetailResponse result = service.updateCatalogItem(1L, request());

        assertEquals("MON-LG-27", result.itemCode());
        assertEquals("Màn hình LG 144Hz 27inch", result.name());
        assertEquals("CAI", result.unit());
    }

    @Test
    void updateRejectsCategoryChangeWhenCatalogHasAssets() {
        when(catalogItems.findById(1L)).thenReturn(Optional.of(catalogItem(category(true))));
        when(categories.findById(11L)).thenReturn(Optional.of(category(11L, "DISPLAY", true)));
        when(assets.existsByCatalogItemId(1L)).thenReturn(true);

        assertThrows(
                IllegalArgumentException.class,
                () -> service.updateCatalogItem(1L, request(11L))
        );
    }

    @Test
    void deactivateCatalogItemDisablesAndUnassignsAllAssets() {
        AssetCatalogItem catalogItem = catalogItem(category(true));
        AssetItem first = asset(7L, catalogItem);
        AssetItem second = asset(8L, catalogItem);
        when(catalogItems.findById(1L)).thenReturn(Optional.of(catalogItem));
        when(assets.findByCatalogItemId(1L)).thenReturn(java.util.List.of(first, second));

        service.deactivateCatalogItem(1L);

        assertEquals(false, catalogItem.getActive());
        assertNull(first.getCatalogItem());
        assertNull(second.getCatalogItem());
        verify(assets).saveAll(java.util.List.of(first, second));
        verify(catalogItems).save(catalogItem);
    }

    @Test
    void listAssignedAssetsRequiresExistingCatalog() {
        AssetCatalogItem catalogItem = catalogItem(category(true));
        AssetItem assigned = asset(7L, catalogItem);
        when(catalogItems.findById(1L)).thenReturn(Optional.of(catalogItem));
        when(assets.findByCatalogItemId(1L)).thenReturn(java.util.List.of(assigned));

        assertEquals(java.util.List.of(assigned), service.listAssignedAssets(1L));
    }

    @Test
    void unassignAssetClearsCatalogWhenAssetBelongsToCatalog() {
        AssetCatalogItem catalogItem = catalogItem(category(true));
        AssetItem assigned = asset(7L, catalogItem);
        when(catalogItems.findById(1L)).thenReturn(Optional.of(catalogItem));
        when(assets.findById(7L)).thenReturn(Optional.of(assigned));

        service.unassignAsset(1L, 7L);

        assertNull(assigned.getCatalogItem());
        verify(assets).save(assigned);
    }

    @Test
    void unassignAssetRejectsAssetFromAnotherCatalog() {
        AssetCatalogItem catalogItem = catalogItem(category(true));
        AssetItem assigned = asset(7L, catalogItem);
        when(catalogItems.findById(2L)).thenReturn(Optional.of(catalogItem(category(11L, "DISPLAY", true))));
        when(assets.findById(7L)).thenReturn(Optional.of(assigned));

        assertThrows(IllegalArgumentException.class, () -> service.unassignAsset(2L, 7L));
        verify(assets, never()).save(any());
    }

    @Test
    void unassignAssetsClearsDistinctSelectedAssets() {
        AssetCatalogItem catalogItem = catalogItem(category(true));
        AssetItem first = asset(7L, catalogItem);
        AssetItem second = asset(8L, catalogItem);
        when(catalogItems.findById(1L)).thenReturn(Optional.of(catalogItem));
        when(assets.findAllById(java.util.List.of(7L, 8L))).thenReturn(java.util.List.of(first, second));

        service.unassignAssets(1L, new AssetCatalogUnassignmentRequest(java.util.List.of(7L, 8L, 8L)));

        assertNull(first.getCatalogItem());
        assertNull(second.getCatalogItem());
        verify(assets).saveAll(java.util.List.of(first, second));
    }

    @Test
    void deleteCatalogItemRejectsAssignedCatalog() {
        AssetCatalogItem catalogItem = catalogItem(category(true));
        when(catalogItems.findById(1L)).thenReturn(Optional.of(catalogItem));
        when(assets.countByCatalogItemId(1L)).thenReturn(2L);

        assertThrows(IllegalArgumentException.class, () -> service.deleteCatalogItem(1L));
        verify(catalogItems, never()).delete(any());
    }

    @Test
    void deleteCatalogItemDeletesWhenUnused() {
        AssetCatalogItem catalogItem = catalogItem(category(true));
        when(catalogItems.findById(1L)).thenReturn(Optional.of(catalogItem));
        when(assets.countByCatalogItemId(1L)).thenReturn(0L);

        service.deleteCatalogItem(1L);

        verify(catalogItems).delete(catalogItem);
    }

    private AssetCatalogItemRequest request() {
        return request(10L);
    }

    private AssetCatalogItemRequest request(Long categoryId) {
        return new AssetCatalogItemRequest(
                "Màn hình LG 144Hz 27inch", categoryId, CatalogType.ASSET,
                null, CatalogUnit.CAI, null, null, null, null, null, true
        );
    }

    private AssetCategory category(boolean active) {
        return category(10L, "MONITOR", active);
    }

    private AssetCategory category(Long id, String code, boolean active) {
        return AssetCategory.builder()
                .id(id)
                .code(code)
                .name("Màn hình")
                .assetClass(AssetClass.FIXED_ASSET)
                .active(active)
                .build();
    }

    private AssetCatalogItem catalogItem(AssetCategory category) {
        return AssetCatalogItem.builder()
                .id(1L)
                .itemCode("MON-LG-27")
                .name("Màn hình LG")
                .category(category)
                .catalogType(CatalogType.ASSET)
                .unit("Cái")
                .active(true)
                .build();
    }

    private AssetItem asset(Long id, AssetCatalogItem catalogItem) {
        return AssetItem.builder()
                .id(id)
                .assetCode("ASSET-" + id)
                .name("Màn hình LG")
                .assetCategory(catalogItem.getCategory())
                .catalogItem(catalogItem)
                .build();
    }
}
