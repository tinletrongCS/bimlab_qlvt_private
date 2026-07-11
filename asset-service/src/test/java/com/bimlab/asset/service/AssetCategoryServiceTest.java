package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.AssetCategoryImportCommitRequest;
import com.bimlab.asset.dto.request.AssetCategoryImportRowRequest;
import com.bimlab.asset.dto.request.AssetCategoryRequest;
import com.bimlab.asset.dto.response.AssetCategoryImportCommitResponse;
import com.bimlab.asset.dto.response.AssetCategoryResponse;
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
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssetCategoryServiceTest {

    @Mock AssetCategoryRepository categories;
    @Mock AssetItemRepository assets;
    @Mock AssetCatalogItemRepository catalogItems;

    @InjectMocks AssetCategoryService service;

    @Test
    void listAndGetCategoryMapStoredValues() {
        AssetCategory root = category(1L, "IT", "Information technology", null);
        root.setDescription("Devices");
        when(categories.findAllByOrderByNameAsc()).thenReturn(List.of(root));
        when(categories.findById(1L)).thenReturn(Optional.of(root));

        List<AssetCategoryResponse> listed = service.listCategories();
        AssetCategoryResponse found = service.getCategory(1L);

        assertEquals(1, listed.size());
        assertEquals("IT", listed.get(0).code());
        assertEquals("Devices", found.description());
        assertThrows(NoSuchElementException.class, () -> service.getCategory(2L));
    }

    @Test
    void createCategoryPersistsParentAndClass() {
        AssetCategory parent = category(1L, "ROOT", "Root", null);
        when(categories.findById(1L)).thenReturn(Optional.of(parent));
        when(categories.save(any(AssetCategory.class))).thenAnswer(invocation -> invocation.getArgument(0));
        AssetCategoryRequest request = new AssetCategoryRequest(
                "LAP", "Laptop", 1L, "FIXED_ASSET", "Portable computer", true);

        AssetCategoryResponse result = service.createCategory(request);

        assertEquals("LAP", result.code());
        assertEquals(1L, result.parentId());
        assertEquals("FIXED_ASSET", result.assetClass());
    }

    @Test
    void createCategoryRejectsDuplicateAndMissingParent() {
        AssetCategoryRequest duplicate = new AssetCategoryRequest(
                "IT", "IT", null, "FIXED_ASSET", null, true);
        when(categories.existsByCode("IT")).thenReturn(true);
        assertThrows(IllegalArgumentException.class, () -> service.createCategory(duplicate));

        AssetCategoryRequest missingParent = new AssetCategoryRequest(
                "LAP", "Laptop", 99L, "FIXED_ASSET", null, true);
        when(categories.existsByCode("LAP")).thenReturn(false);
        when(categories.findById(99L)).thenReturn(Optional.empty());
        assertThrows(NoSuchElementException.class, () -> service.createCategory(missingParent));
    }

    @Test
    void updateCategoryPersistsChangedValues() {
        AssetCategory existing = category(1L, "OLD", "Old", null);
        AssetCategory parent = category(2L, "ROOT", "Root", null);
        when(categories.findById(1L)).thenReturn(Optional.of(existing));
        when(categories.findById(2L)).thenReturn(Optional.of(parent));
        when(categories.save(existing)).thenReturn(existing);

        AssetCategoryResponse result = service.updateCategory(1L, new AssetCategoryRequest(
                "NEW", "New", 2L, "fixed_asset", "Changed", false));

        assertEquals("NEW", result.code());
        assertEquals(2L, result.parentId());
        assertEquals(false, result.active());
    }

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

    @Test
    void importCategories_importsReferenceParentRowsWhenDatabaseIsEmpty() {
        when(categories.findAllByOrderByNameAsc()).thenReturn(List.of());
        when(categories.save(any(AssetCategory.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AssetCategoryImportCommitResponse result = service.importCategories(new AssetCategoryImportCommitRequest(List.of(
                importRow(2, "Phân loại", "FIXED_ASSET", "Tài sản cố định", ""),
                importRow(3, "Phân loại", "TOOL_EQUIPMENT", "Công cụ dụng cụ", ""),
                importRow(4, "Loại tài sản cố định", "TANGIBLE", "Tài sản cố định hữu hình", "FIXED_ASSET"),
                importRow(5, "Loại tài sản cố định", "INTANGIBLE", "Tài sản cố định vô hình", "FIXED_ASSET"),
                importRow(6, "Loại công cụ dụng cụ", "SINGLE_USE", "Công cụ dụng cụ phân bổ 1 lần", "TOOL_EQUIPMENT"),
                importRow(7, "Loại công cụ dụng cụ", "MULTI_USE", "Công cụ dụng cụ phân bổ nhiều lần", "TOOL_EQUIPMENT")
        )));

        assertEquals("SUCCESS", result.uploadStatus());
        assertEquals(6, result.importedRows());
        assertEquals(0, result.skippedRows());
        verify(categories, times(6)).save(any(AssetCategory.class));
    }

    private AssetCategoryImportRowRequest importRow(
            int rowNumber,
            String group,
            String code,
            String name,
            String parentCode) {
        return new AssetCategoryImportRowRequest(rowNumber, group, code, name, parentCode);
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
