package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.AssetCategoryRequest;
import com.bimlab.asset.dto.response.AssetCategoryTreeResponse;
import com.bimlab.asset.model.AssetCategory;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.status.AssetClass;
import com.bimlab.asset.repository.AssetCatalogItemRepository;
import com.bimlab.asset.repository.AssetCategoryRepository;
import com.bimlab.asset.repository.AssetItemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssetCategoryServiceTest {

    @Mock AssetCategoryRepository categories;
    @Mock AssetItemRepository assets;
    @Mock AssetCatalogItemRepository catalogItems;

    @InjectMocks AssetCategoryService service;

    @Test
    void listCategoryTree_nestsChildrenUnderRoot() {
        AssetCategory root = category(1L, "IT", "IT", null);
        AssetCategory laptop = category(2L, "LAP", "Laptop", root);
        when(categories.findAllByOrderByNameAsc()).thenReturn(List.of(root, laptop));

        List<AssetCategoryTreeResponse> tree = service.listCategoryTree();

        assertEquals(1, tree.size());
        assertEquals("IT", tree.get(0).code());
        assertEquals(1, tree.get(0).children().size());
        assertEquals("LAP", tree.get(0).children().get(0).code());
        assertEquals(1L, tree.get(0).children().get(0).parentId());
    }

    @Test
    void updateCategory_rejectsSelfParent() {
        AssetCategory category = category(1L, "IT", "IT", null);
        when(categories.findById(1L)).thenReturn(Optional.of(category));

        AssetCategoryRequest req = new AssetCategoryRequest(
                "IT",
                "IT",
                1L,
                "FIXED_ASSET",
                null,
                true
        );

        assertThrows(IllegalArgumentException.class, () -> service.updateCategory(1L, req));
        verify(categories, never()).save(category);
    }

    @Test
    void deleteCategory_rejectsWhenChildrenExist() {
        AssetCategory category = category(1L, "IT", "IT", null);
        when(categories.findById(1L)).thenReturn(Optional.of(category));
        when(categories.existsByParentId(1L)).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> service.deleteCategory(1L));
        verify(categories, never()).delete(category);
    }

    @Test
    void deleteCategory_rejectsWhenAssetsUseCategory() {
        AssetCategory category = category(1L, "IT", "IT", null);
        when(categories.findById(1L)).thenReturn(Optional.of(category));
        when(categories.existsByParentId(1L)).thenReturn(false);
        when(assets.findByAssetCategoryId(1L)).thenReturn(List.of(AssetItem.builder().id(9L).build()));

        assertThrows(IllegalArgumentException.class, () -> service.deleteCategory(1L));
        verify(categories, never()).delete(category);
    }

    @Test
    void deleteCategory_rejectsWhenCatalogItemsUseCategory() {
        AssetCategory category = category(1L, "IT", "IT", null);
        when(categories.findById(1L)).thenReturn(Optional.of(category));
        when(categories.existsByParentId(1L)).thenReturn(false);
        when(assets.findByAssetCategoryId(1L)).thenReturn(List.of());
        when(catalogItems.existsByCategoryId(1L)).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> service.deleteCategory(1L));
        verify(categories, never()).delete(category);
    }

    @Test
    void deleteCategory_deletesWhenUnused() {
        AssetCategory category = category(1L, "IT", "IT", null);
        when(categories.findById(1L)).thenReturn(Optional.of(category));
        when(categories.existsByParentId(1L)).thenReturn(false);
        when(assets.findByAssetCategoryId(1L)).thenReturn(List.of());
        when(catalogItems.existsByCategoryId(1L)).thenReturn(false);

        service.deleteCategory(1L);

        verify(categories).delete(category);
    }

    private AssetCategory category(Long id, String code, String name, AssetCategory parent) {
        return AssetCategory.builder()
                .id(id)
                .code(code)
                .name(name)
                .parent(parent)
                .assetClass(AssetClass.FIXED_ASSET)
                .active(true)
                .build();
    }
}
