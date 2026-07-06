package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.AssetCategoryImportCommitRequest;
import com.bimlab.asset.dto.request.AssetCategoryImportValidateRequest;
import com.bimlab.asset.dto.request.AssetCategoryRequest;
import com.bimlab.asset.dto.response.AssetCategoryImportCommitResponse;
import com.bimlab.asset.dto.response.AssetCategoryImportValidationResponse;
import com.bimlab.asset.dto.response.AssetCategoryResponse;
import com.bimlab.asset.dto.response.AssetCategoryTreeResponse;
import com.bimlab.asset.model.AssetCategory;
import com.bimlab.asset.model.status.AssetClass;
import com.bimlab.asset.repository.AssetCatalogItemRepository;
import com.bimlab.asset.repository.AssetCategoryRepository;
import com.bimlab.asset.repository.AssetItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AssetCategoryService {
    private final AssetCategoryRepository categories;
    private final AssetItemRepository assets;
    private final AssetCatalogItemRepository catalogItems;

    @Transactional(readOnly = true)
    public List<AssetCategoryResponse> listCategories() {
        return categories.findAllByOrderByNameAsc()
                .stream()
                .map(this::modelToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AssetCategoryTreeResponse> listCategoryTree() {
        List<AssetCategory> categoryList = categories.findAllByOrderByNameAsc();
        Map<Long, List<AssetCategory>> childrenByParentId = new LinkedHashMap<>();

        // gom danh mục theo parentId
        for (AssetCategory category : categoryList) {
            Long parentId = category.getParent() == null ? null : category.getParent().getId();
            childrenByParentId
                    .computeIfAbsent(parentId, key -> new ArrayList<>())
                    .add(category);
        }

        return childrenByParentId.getOrDefault(null, List.of())
                .stream()
                .map(category -> modelToTreeDto(category, childrenByParentId))
                .toList();
    }

    @Transactional(readOnly = true)
    public AssetCategoryResponse getCategory(Long id) {
        AssetCategory category = categories.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy danh mục với id:" + id));
        return modelToDto(category);
    }

    @Transactional
    public AssetCategoryResponse createCategory(AssetCategoryRequest req) {

        if (categories.existsByCode(req.code())) {
            throw new IllegalArgumentException("Danh mục với mã " + req.code() + " đã tồn tại.");
        }
        AssetCategory parent = null;
        if (req.parentId() != null) {
            parent = categories.findById(req.parentId())
                    .orElseThrow(() -> new NoSuchElementException(
                            "Không tìm thấy danh mục cha với id:" + req.parentId()
                    ));
        }
        AssetClass assetClass = AssetClass.valueOf(req.assetClass());

        AssetCategory category = AssetCategory.builder()
                .code(req.code())
                .name(req.name())
                .parent(parent)
                .assetClass(assetClass)
                .description(req.description())
                .active(req.active())
                .build();

        AssetCategory saved = categories.save(category);
        return modelToDto(saved);
    }

    @Transactional(readOnly = true)
    public AssetCategoryImportValidationResponse validateCategoryImport(
            AssetCategoryImportValidateRequest req) {
        // TODO PRACTICE CATEGORY IMPORT 1:
        // Validate các dòng từ sheet DanhMuc_ThamChieu.
        //
        // Contract frontend gửi lên:
        // - group: cột "Nhóm" trong Excel.
        // - code: cột "Mã/Giá trị nhập", dùng làm khóa upsert.
        // - name: cột "Diễn giải", là tên danh mục hoặc tên giá trị tham chiếu.
        // - parentCode: cột "Danh mục cha", trỏ tới code của dòng cha nếu có.
        //
        // Yêu cầu gợi ý:
        // - Chỉ xử lý các dòng group = "Danh mục"; các nhóm "Phân loại",
        //   "Loại tài sản cố định", "Loại công cụ dụng cụ", "Trạng thái" có thể SKIP.
        // - code và name không được rỗng.
        // - code không được trùng lặp trong chính file upload.
        // - Nếu parentCode có giá trị thì phải tồn tại trong DB hoặc nằm trong file upload.
        // - Suy ra assetClass từ cha gần nhất:
        //   FIXED_ASSET/TANGIBLE/INTANGIBLE => FIXED_ASSET,
        //   TOOL_EQUIPMENT/SINGLE_USE/MULTI_USE => TOOL_EQUIPMENT.
        // - Trả từng dòng status VALID/INVALID/WARNING và action CREATE/UPDATE/SKIP.
        throw new UnsupportedOperationException("TODO: validate asset category import");
    }

    @Transactional
    public AssetCategoryImportCommitResponse importCategories(
            AssetCategoryImportCommitRequest req) {
        // TODO PRACTICE CATEGORY IMPORT 2:
        // Upsert danh mục sau khi người dùng bấm "Xác nhận nhập".
        //
        // Flow nên làm:
        // 1. Gọi lại validateCategoryImport(...) hoặc tách helper validate dùng chung.
        // 2. Nếu còn dòng INVALID thì không ghi DB, trả response FAILED/HAS_ERROR.
        // 3. Với mỗi dòng action CREATE/UPDATE:
        //    - Tìm AssetCategory theo code.
        //    - Tìm parent theo parentCode nếu có.
        //    - Set code, name, parent, assetClass, description, active=true.
        //    - Save bằng categories.save(...).
        // 4. Upsert theo thứ tự cha trước con để tránh parent chưa tồn tại.
        // 5. Trả importedRows, updatedRows, skippedRows, errorRows và rows preview cuối.
        throw new UnsupportedOperationException("TODO: import asset categories");
    }

    @Transactional
    public AssetCategoryResponse updateCategory(Long id, AssetCategoryRequest req) {
        AssetCategory category = categories.findById(id)
                    .orElseThrow(() -> new NoSuchElementException("Không tim thầy danh mục với id" + id));
        AssetCategory parent = null;
        if (req.parentId() != null) {
            parent = categories.findById(req.parentId())
                    .orElseThrow(() -> new NoSuchElementException(
                            "Không tìm thấy danh mục cha với id: " + req.parentId()
                    ));
        }
        if (req.parentId() != null && req.parentId().equals(id)) {
            throw new IllegalArgumentException("Danh mục cha không được trỏ về chính nó.");
        }

        if (!category.getCode().equals(req.code()) && categories.existsByCode(req.code())) {
            throw new IllegalArgumentException("Danh mục với mã " + req.code() + " đã tồn tại.");
        }

        AssetClass assetClass = AssetClass.valueOf(req.assetClass().trim().toUpperCase());

        category.setCode(req.code());
        category.setName(req.name());
        category.setParent(parent);
        category.setAssetClass(assetClass);
        category.setDescription(req.description());
        category.setActive(req.active());

        AssetCategory saved = categories.save(category);

        return modelToDto(saved);
    }

    @Transactional
    public void deleteCategory(Long id) {
        AssetCategory category = categories.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy danh mục với id: " + id));

        if (categories.existsByParentId(id)) {
            throw new IllegalArgumentException("Không thể xóa danh mục đang có danh mục con.");
        }

        if (!assets.findByAssetCategoryId(id).isEmpty()) {
            throw new IllegalArgumentException("Không thể xóa danh mục đang được tài sản sử dụng.");
        }

        if (catalogItems.existsByCategoryId(id)) {
            throw new IllegalArgumentException("Không thể xóa danh mục đang được danh mục vật tư sử dụng.");
        }

        categories.delete(category);
    }

    // Helper functions

    private AssetCategoryResponse modelToDto(AssetCategory category) {
        return new AssetCategoryResponse(
                category.getId(),
                category.getCode(),
                category.getName(),
                category.getAssetClass() == null ? null : category.getAssetClass().name(),
                category.getParent() == null ? null : category.getParent().getId(),
                category.getDescription(),
                category.getActive()
        );
    }

    private AssetCategoryTreeResponse modelToTreeDto(
            AssetCategory category,
            Map<Long, List<AssetCategory>> childrenByParentId) {

        List<AssetCategoryTreeResponse> children = childrenByParentId
                .getOrDefault(category.getId(), List.of())
                .stream()
                .map(child -> modelToTreeDto(child, childrenByParentId))
                .toList();

        return new AssetCategoryTreeResponse(
                category.getId(),
                category.getCode(),
                category.getName(),
                category.getAssetClass().name(),
                category.getParent() == null ? null : category.getParent().getId(),
                category.getDescription(),
                category.getActive(),
                children
        );
    }
}
