package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.AssetCategoryRequest;
import com.bimlab.asset.dto.response.AssetCategoryResponse;
import com.bimlab.asset.dto.response.AssetCategoryTreeResponse;
import com.bimlab.asset.model.AssetCategory;
import com.bimlab.asset.repository.AssetCategoryRepository;
import com.bimlab.asset.repository.AssetItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class AssetCategoryService {
    private final AssetCategoryRepository categories;
    private final AssetItemRepository assets;

    @Transactional(readOnly = true)
    public List<AssetCategoryResponse> listCategories() {
//        List<AssetCategory> categoryList = categories.findAllByOrderByNameAsc();
//        List<AssetCategoryResponse> categoryResponses = new ArrayList<>();
//        for (AssetCategory category : categoryList) {
//            categoryResponses.add(modelToDto(category));
//        }
//        return categoryResponses;
        return categories.findAllByOrderByNameAsc()
                .stream()
                .map(this::modelToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AssetCategoryTreeResponse> listCategoryTree() {
        // TODO PRACTICE 2:
        // Build cây phân cấp danh mục từ danh sách phẳng asset_categories.
        //
        // Yêu cầu:
        // - Node gốc là category có parent = null.
        // - Mỗi node có children là các category con.
        // - Không query DB lặp theo từng node nếu có thể; ưu tiên load all rồi group theo parentId.
        throw new UnsupportedOperationException("TODO: build asset category tree");
    }

    @Transactional(readOnly = true)
    public AssetCategoryResponse getCategory(Long id) {
        AssetCategory category = categories.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy danh mục với id:" + id));
        return modelToDto(category);
    }

    @Transactional
    public AssetCategoryResponse createCategory(AssetCategoryRequest req) {
        // TODO PRACTICE 4:
        // Tạo danh mục mới.
        //
        // Yêu cầu:
        // - Validate code không trùng bằng categories.existsByCode(req.code()).
        // - Nếu req.parentId() != null thì tìm parent category.
        // - Parse req.assetClass() sang AssetClass enum.
        // - Set code, name, parent, assetClass, description, active.
        // - Save bằng categories.save(...).
        // - Return AssetCategoryResponse.
        throw new UnsupportedOperationException("TODO: create asset category");
    }

    @Transactional
    public AssetCategoryResponse updateCategory(Long id, AssetCategoryRequest req) {
        // TODO PRACTICE 5:
        // Cập nhật danh mục.
        //
        // Yêu cầu:
        // - Tìm category hiện tại theo id.
        // - Không cho parentId trỏ về chính nó.
        // - Nếu đổi code, kiểm tra code mới không trùng.
        // - Cập nhật các field giống create.
        // - Save và return response.
        throw new UnsupportedOperationException("TODO: update asset category");
    }

    @Transactional
    public void deleteCategory(Long id) {
        // TODO PRACTICE 6:
        // Xóa danh mục.
        //
        // Yêu cầu nghiệp vụ đề xuất:
        // - Không cho xóa nếu category còn category con.
        // - Không cho xóa nếu category đang được asset.assets hoặc asset_catalog_items tham chiếu.
        // - Nếu hợp lệ thì categories.delete(...).
        //
        // Gợi ý:
        // - categories.existsByParentId(id)
        // - assets.findByAssetCategoryId(id)
        // - Có thể cần bổ sung method repository cho asset_catalog_items khi bạn implement thật.
        throw new UnsupportedOperationException("TODO: delete asset category");
    }

    // Helper function
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
            Map<Long, List<AssetCategory>> childrenByParentId
    ) {
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
