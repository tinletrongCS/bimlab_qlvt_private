package com.bimlab.asset.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.bimlab.asset.dto.request.AssetCategoryImportCommitRequest;
import com.bimlab.asset.dto.request.AssetCategoryImportRowRequest;
import com.bimlab.asset.dto.request.AssetCategoryImportValidateRequest;
import com.bimlab.asset.dto.request.AssetCategoryRequest;
import com.bimlab.asset.dto.response.AssetCategoryImportCommitResponse;
import com.bimlab.asset.dto.response.AssetCategoryImportMessageResponse;
import com.bimlab.asset.dto.response.AssetCategoryImportRowResult;
import com.bimlab.asset.dto.response.AssetCategoryImportValidationResponse;
import com.bimlab.asset.dto.response.AssetCategoryResponse;
import com.bimlab.asset.dto.response.AssetCategoryTreeResponse;
import com.bimlab.asset.model.AssetCategory;
import com.bimlab.asset.model.status.AssetClass;
import com.bimlab.asset.repository.AssetCatalogItemRepository;
import com.bimlab.asset.repository.AssetCategoryRepository;
import com.bimlab.asset.repository.AssetItemRepository;

import lombok.RequiredArgsConstructor;

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
        List<AssetCategoryImportRowRequest> rows = req.rows() == null ? List.of() : req.rows();
        Map<String, AssetCategory> dbByCode = categories.findAllByOrderByNameAsc()
                .stream()
                .collect(java.util.stream.Collectors.toMap(
                        category -> normalizeCode(category.getCode()),
                        category -> category,
                        (first, second) -> first
                ));
        Map<String, AssetCategoryImportRowRequest> fileCategoryByCode = rows.stream()
                .filter(this::isCategoryImportRow)
                .filter(row -> !normalizeCode(row.code()).isBlank())
                .collect(java.util.stream.Collectors.toMap(
                        row -> normalizeCode(row.code()),
                        row -> row,
                        (first, second) -> first
                ));
        Set<String> seenCodes = new HashSet<>();

        List<AssetCategoryImportRowResult> results = rows.stream()
                .map(row -> validateCategoryImportRow(row, dbByCode, fileCategoryByCode, seenCodes))
                .toList();

        int errorRows = (int) results.stream().filter(row -> !row.errors().isEmpty()).count();
        int warningRows = (int) results.stream().filter(row -> row.errors().isEmpty() && !row.warnings().isEmpty()).count();
        // int validRows = (int) results.stream().filter(row -> row.errors().isEmpty() && !"SKIP".equals(row.action())).count();
        int validRows = (int) results.stream().filter(row -> row.errors().isEmpty() && "VALID".equals(row.status())).count();
        String uploadStatus = errorRows > 0 ? "HAS_ERROR" : "VALID";

        return new AssetCategoryImportValidationResponse(
                uploadStatus,
                results.size(),
                validRows,
                errorRows,
                warningRows,
                results
        );
    }

    @Transactional
    public AssetCategoryImportCommitResponse importCategories(
            AssetCategoryImportCommitRequest req) {
        AssetCategoryImportValidateRequest validateReq = new AssetCategoryImportValidateRequest(req.rows());
        AssetCategoryImportValidationResponse validation = validateCategoryImport(validateReq);

        if ("HAS_ERROR".equals(validation.uploadStatus())) {
            return new AssetCategoryImportCommitResponse(
                    "FAILED",
                    0,
                    0,
                    (int) validation.rows().stream().filter(r -> "SKIP".equals(r.action())).count(),
                    validation.errorRows(),
                    validation.rows()
            );
        }

        Map<String, AssetCategory> dbByCode = categories.findAllByOrderByNameAsc()
                .stream()
                .collect(java.util.stream.Collectors.toMap(
                        category -> normalizeCode(category.getCode()),
                        category -> category,
                        (first, second) -> first
                ));

        Map<String, AssetCategoryImportRowRequest> fileCategoryByCode = req.rows().stream()
                .filter(this::isCategoryImportRow)
                .filter(row -> !normalizeCode(row.code()).isBlank())
                .collect(java.util.stream.Collectors.toMap(
                        row -> normalizeCode(row.code()),
                        row -> row,
                        (first, second) -> first
                ));

        List<AssetCategoryImportRowRequest> sortedRows = new ArrayList<>();
        Set<String> visited = new HashSet<>();
        Set<String> visiting = new HashSet<>();
        
        for (AssetCategoryImportRowRequest row : fileCategoryByCode.values()) {
            dfsSort(row, fileCategoryByCode, visited, visiting, sortedRows);
        }

        int importedRows = 0;
        int updatedRows = 0;

        for (AssetCategoryImportRowRequest row : sortedRows) {
            String code = normalizeCode(row.code());
            String parentCode = normalizeCode(row.parentCode());

            AssetCategory category = dbByCode.get(code);
            boolean isUpdate = category != null;
            if (!isUpdate) {
                category = new AssetCategory();
                category.setCode(trim(row.code())); 
                category.setDescription("");
            }

            category.setName(trim(row.name()));
            
            AssetCategory parent = null;
            if (!parentCode.isBlank()) {
                parent = dbByCode.get(parentCode);
            }
            category.setParent(parent);

            AssetClass assetClass = resolveImportAssetClass(code, dbByCode, fileCategoryByCode, new HashSet<>());
            category.setAssetClass(assetClass);
            category.setActive(true);

            category = categories.save(category);
            dbByCode.put(code, category);

            if (isUpdate) {
                updatedRows++;
            } else {
                importedRows++;
            }
        }
        
        int skippedRows = (int) validation.rows().stream()
                .filter(r -> "SKIP".equals(r.action()))
                .count();

        return new AssetCategoryImportCommitResponse(
                "SUCCESS",
                importedRows,
                updatedRows,
                skippedRows,
                0,
                validation.rows()
        );
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

    private AssetCategoryImportRowResult validateCategoryImportRow(
            AssetCategoryImportRowRequest row,
            Map<String, AssetCategory> dbByCode,
            Map<String, AssetCategoryImportRowRequest> fileCategoryByCode,
            Set<String> seenCodes) {
        List<AssetCategoryImportMessageResponse> errors = new ArrayList<>();
        List<AssetCategoryImportMessageResponse> warnings = new ArrayList<>();
        String code = normalizeCode(row.code());
        String name = trim(row.name());
        String parentCode = normalizeCode(row.parentCode());

        if (!isCategoryImportRow(row)) {
            return new AssetCategoryImportRowResult(
                    rowNumber(row),
                    "VALID",
                    code,
                    name,
                    parentCode,
                    "SKIP",
                    List.of(),
                    List.of(message("group", "SKIPPED_REFERENCE_ROW", "Dòng tham chiếu không phải danh mục, backend sẽ bỏ qua."))
            );
        }

        if (code.isBlank()) {
            errors.add(message("code", "REQUIRED", "Mã danh mục không được rỗng."));
        } else if (!seenCodes.add(code)) {
            errors.add(message("code", "DUPLICATED_IN_FILE", "Mã danh mục bị trùng trong file upload."));
        }

        if (name.isBlank()) {
            errors.add(message("name", "REQUIRED", "Tên danh mục không được rỗng."));
        }

        if (!parentCode.isBlank()
                && resolveImportAssetClass(parentCode, dbByCode, fileCategoryByCode, new HashSet<>()) == null) {
            errors.add(message("parentCode", "NOT_FOUND", "Danh mục cha không tồn tại trong DB hoặc trong file upload."));
        }

        if (!parentCode.isBlank() && parentCode.equals(code)) {
            errors.add(message("parentCode", "SELF_PARENT", "Danh mục cha không được trỏ về chính mã danh mục."));
        }

        AssetClass assetClass = resolveImportAssetClass(
                parentCode.isBlank() ? code : parentCode,
                dbByCode,
                fileCategoryByCode,
                new HashSet<>()
        );
        if (assetClass == null && !dbByCode.containsKey(code)) {
            errors.add(message("assetClass", "UNRESOLVED", "Không suy ra được loại tài sản từ Danh mục cha."));
        }

        String action = dbByCode.containsKey(code) ? "UPDATE" : "CREATE";
        String status = errors.isEmpty() ? (warnings.isEmpty() ? "VALID" : "WARNING") : "INVALID";
        return new AssetCategoryImportRowResult(
                rowNumber(row),
                status,
                code,
                name,
                parentCode,
                action,
                errors,
                warnings
        );
    }

    private AssetClass resolveImportAssetClass(
            String code,
            Map<String, AssetCategory> dbByCode,
            Map<String, AssetCategoryImportRowRequest> fileCategoryByCode,
            Set<String> visiting) {
        String normalized = normalizeCode(code);
        if (normalized.isBlank()) return null;
        if (Set.of("FIXED_ASSET", "TANGIBLE", "INTANGIBLE").contains(normalized)) return AssetClass.FIXED_ASSET;
        if (Set.of("TOOL_EQUIPMENT", "SINGLE_USE", "MULTI_USE").contains(normalized)) return AssetClass.TOOL_EQUIPMENT;
        AssetCategory dbCategory = dbByCode.get(normalized);
        if (dbCategory != null) return dbCategory.getAssetClass();
        AssetCategoryImportRowRequest fileRow = fileCategoryByCode.get(normalized);
        if (fileRow == null || !visiting.add(normalized)) return null;
        return resolveImportAssetClass(fileRow.parentCode(), dbByCode, fileCategoryByCode, visiting);
    }

    private boolean isCategoryImportRow(AssetCategoryImportRowRequest row) {
        String group = normalizeText(row.group()).replace(" ", "");
        return Set.of(
                "phanloai",
                "phanloailopcon",
                "loaitaisancodinh",
                "loaicongcudungcu",
                "danhmuc",
                "danhmuccha",
                "danhmuctaisan"
        ).contains(group);
    }

    private AssetCategoryImportMessageResponse message(String field, String code, String message) {
        return new AssetCategoryImportMessageResponse(field, code, message);
    }

    private String normalizeCode(String raw) {
        return trim(raw).toUpperCase(Locale.ROOT);
    }

    private String normalizeText(String raw) {
        return java.text.Normalizer.normalize(trim(raw), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private String trim(String raw) {
        return raw == null ? "" : raw.trim();
    }

    private int rowNumber(AssetCategoryImportRowRequest row) {
        return row.rowNumber() == null ? 0 : row.rowNumber();
    }

    private void dfsSort(AssetCategoryImportRowRequest row, 
                         Map<String, AssetCategoryImportRowRequest> fileCategoryByCode, 
                         Set<String> visited, Set<String> visiting, 
                         List<AssetCategoryImportRowRequest> sortedRows) {
        String code = normalizeCode(row.code());
        if (visited.contains(code)) return;
        if (!visiting.add(code)) return; 
        
        String parentCode = normalizeCode(row.parentCode());
        if (!parentCode.isBlank()) {
            AssetCategoryImportRowRequest parentRow = fileCategoryByCode.get(parentCode);
            if (parentRow != null) {
                dfsSort(parentRow, fileCategoryByCode, visited, visiting, sortedRows);
            }
        }
        visited.add(code);
        sortedRows.add(row);
    }
}
