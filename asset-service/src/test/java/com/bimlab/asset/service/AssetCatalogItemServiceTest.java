package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.AssetCatalogItemRequest;
import com.bimlab.asset.dto.response.AssetCatalogItemDetailResponse;
import com.bimlab.asset.entity.AssetCatalogItem;
import com.bimlab.asset.entity.AssetCategory;
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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

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

        assertEquals("DM-000001", result.itemCode());
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
}
