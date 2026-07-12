package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.AssetRequest;
import com.bimlab.asset.dto.request.AssetImportCommitRequest;
import com.bimlab.asset.dto.request.AssetImportRowRequest;
import com.bimlab.asset.dto.request.AssetImportValidateRequest;
import com.bimlab.asset.dto.request.DisposeAssetRequest;
import com.bimlab.asset.dto.response.AssetImportCommitResponse;
import com.bimlab.asset.dto.response.AssetImportMessageResponse;
import com.bimlab.asset.dto.response.AssetImportRowResult;
import com.bimlab.asset.dto.response.AssetImportValidationResponse;
import com.bimlab.asset.dto.response.DepreciationSnapshot;
import com.bimlab.asset.dto.response.UtilizationReportResponse;
import com.bimlab.asset.model.AssetCodeSequence;
import com.bimlab.asset.model.AssetCatalogItem;
import com.bimlab.asset.model.AssetCategory;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.status.AssetClass;
import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.model.status.FixedAssetType;
import com.bimlab.asset.model.status.StatusParser;
import com.bimlab.asset.model.status.ToolUsageType;
import com.bimlab.asset.repository.AssetCatalogItemRepository;
import com.bimlab.asset.repository.AssetCategoryRepository;
import com.bimlab.asset.repository.AssetCodeSequenceRepository;
import com.bimlab.asset.repository.AssetItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Period;
import java.time.Year;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssetService {
    private final AssetItemRepository assets;
    private final VendorService vendorService;
    private final AssetCategoryRepository assetCategories;
    private final AssetCatalogItemRepository catalogItems;
    private final AssetCodeSequenceRepository assetCodeSequences;

    @Transactional(readOnly = true)
    public List<AssetItem> listAssets() {
        return assets.findAll();
    }

    @Transactional(readOnly = true)
    public Page<AssetItem> listAssetsPaged(Pageable pageable) {
        return assets.findAll(pageable);
    }


    @Transactional(readOnly = true)
    public AssetItem getAssetById(Long id) {
        return assets.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy tài sản với id: " + id));
    }

    @Transactional(readOnly = true)
    public AssetItem getAsset(Long id) {
        return getAssetById(id);
    }

    @Transactional
    public AssetItem createAsset(AssetRequest req) {
        AssetItem item = new AssetItem();
        applyAsset(item, req);
        return assets.save(item);
    }

    @Transactional(readOnly = true)
    public AssetImportValidationResponse validateAssetImport(AssetImportValidateRequest req) {
        List<AssetImportRowRequest> rows = req.rows() == null ? List.of() : req.rows();
        Map<Long, Long> previewCounters = new HashMap<>();
        List<AssetImportRowResult> results = rows.stream()
                .map(row -> validateImportRow(row, previewCounters))
                .toList();

        int errorRows = (int) results.stream().filter(row -> !row.errors().isEmpty()).count();
        int warningRows = (int) results.stream()
                .filter(row -> row.errors().isEmpty() && !row.warnings().isEmpty())
                .count();
        int validRows = rows.size() - errorRows;
        String uploadStatus = errorRows > 0 ? "HAS_ERROR" : "VALID";

        return new AssetImportValidationResponse(
                uploadStatus,
                rows.size(),
                validRows,
                errorRows,
                warningRows,
                results
        );
    }

    @Transactional
    public AssetImportCommitResponse importAssets(AssetImportCommitRequest req) {
        List<AssetImportRowRequest> rows = req.rows() == null ? List.of() : req.rows();
        AssetImportValidationResponse validation = validateAssetImport(new AssetImportValidateRequest(rows));
        boolean allOrNothing = "ALL_OR_NOTHING".equalsIgnoreCase(req.importMode());


        if (allOrNothing && validation.errorRows() > 0)
        {
            List<AssetImportRowResult> skipped = validation.rows().stream()
                        .map(row -> row.errors().isEmpty()
                            ? withStatus(row, "SKIPPED", row.generatedAssetCodePreview())
                            : row)
                        .toList();
                return new AssetImportCommitResponse("FAILED", 0, rows.size(), validation.errorRows(), skipped);
                    
        }
        Map<Integer, AssetImportRowResult> validationByRow = validation.rows().stream()
                .collect(Collectors.toMap(AssetImportRowResult::rowNumber, row -> row, (first, second) -> first));

        List<AssetImportRowResult> commitResults = new ArrayList<>();
        int importedRows = 0;
        int skippedRows = 0;
        int errorRows = 0;

        // quan trong
        for (AssetImportRowRequest row : rows) {
            AssetImportRowResult validationRow = validationByRow.get(rowNumber(row));
            if (validationRow == null || !validationRow.errors().isEmpty()) {
                skippedRows++;
                if (validationRow != null) {
                    errorRows++;
                    commitResults.add(withStatus(validationRow, "SKIPPED", validationRow.generatedAssetCodePreview()));
                }
                continue;
            }

            try {
                ImportLookup lookup = resolveImportLookup(row);
                String generatedAssetCode = nextAssetCode(lookup.category());
                AssetItem item = toAssetItem(row, lookup, generatedAssetCode);
                assets.save(item);
                importedRows++;
                commitResults.add(withStatus(validationRow, "IMPORTED", generatedAssetCode));
            } catch (RuntimeException ex) {
                skippedRows++;
                errorRows++;
                List<AssetImportMessageResponse> errors = new ArrayList<>(validationRow.errors());
                errors.add(message("row", "IMPORT_FAILED", "Không thể lưu dòng import: " + ex.getMessage()));
                commitResults.add(new AssetImportRowResult(
                        validationRow.rowNumber(),
                        "SKIPPED",
                        validationRow.assetName(),
                        validationRow.categoryCode(),
                        validationRow.generatedAssetCodePreview(),
                        errors,
                        validationRow.warnings()
                ));
            }
        }

        String uploadStatus = errorRows > 0 ? importedRows > 0 ? "PARTIALLY_IMPORTED" : "FAILED" : "IMPORTED";
        return new AssetImportCommitResponse(uploadStatus, importedRows, skippedRows, errorRows, commitResults);
    }

    @Transactional
    public AssetItem updateAsset(Long id, AssetRequest req) {
        AssetItem item = getAssetById(id);
        applyAsset(item, req);
        return assets.save(item);
    }

    @Transactional
    public void deleteAsset(Long id) {
        assets.delete(getAssetById(id));
    }

    private AssetImportRowResult validateImportRow(
            AssetImportRowRequest row,
            Map<Long, Long> previewCounters
    ) {
        List<AssetImportMessageResponse> errors = new ArrayList<>();
        List<AssetImportMessageResponse> warnings = new ArrayList<>();

        if (isBlank(row.name())) {
            errors.add(message("name", "REQUIRED", "Tên tài sản không được để trống"));
        }
        if (isBlank(row.categoryCode())) {
            errors.add(message("categoryCode", "REQUIRED", "Mã danh mục không được để trống"));
        }
        if (isBlank(row.assetClass())) {
            errors.add(message("assetClass", "REQUIRED", "Phân loại tài sản không được để trống"));
        }
        if (!isBlank(row.assetCode())) {
            warnings.add(message("assetCode", "ASSET_CODE_IGNORED", "Mã tài sản trong file sẽ được bỏ qua; hệ thống tự sinh mã mới"));
        }

        AssetClass assetClass = parseAssetClass(row.assetClass(), errors);
        AssetCategory category = resolveCategory(row.categoryCode(), errors);
        if (category != null) {
            if (Boolean.FALSE.equals(category.getActive())) {
                errors.add(message("categoryCode", "CATEGORY_INACTIVE", "Danh mục tài sản đang ngưng sử dụng"));
            }
            if (assetCategories.existsByParentId(category.getId())) {
                errors.add(message("categoryCode", "CATEGORY_NOT_LEAF", "Chỉ được import vào danh mục cụ thể"));
            }
            if (assetClass != null && category.getAssetClass() != assetClass) {
                errors.add(message("assetClass", "ASSET_CLASS_MISMATCH", "Phân loại tài sản không khớp với danh mục"));
            }
        }

        validateClassType(row, assetClass, errors, warnings);
        validateCatalogItem(row, category, errors, warnings);
        validateStatus(row, errors);
        validateMoneyAndDates(row, errors, warnings);
        if (!isBlank(row.departmentName())) {
            warnings.add(message("departmentName", "DEPARTMENT_NOT_MAPPED", "Frontend đang gửi tên phòng ban; backend chưa map sang departmentId"));
        }
        if (!isBlank(row.siteName())) {
            warnings.add(message("siteName", "SITE_NOT_MAPPED", "Frontend đang gửi tên chi nhánh; backend chưa map sang siteId"));
        }

        String generatedPreview = null;
        if (category != null && errors.isEmpty()) {
            generatedPreview = previewAssetCode(category, previewCounters);
        }
        String status = errors.isEmpty()
                ? warnings.isEmpty() ? "VALID" : "WARNING"
                : "INVALID";
        return new AssetImportRowResult(
                rowNumber(row),
                status,
                trimToNull(row.name()),
                trimToNull(row.categoryCode()),
                generatedPreview,
                errors,
                warnings
        );
    }

    private void validateClassType(
            AssetImportRowRequest row,
            AssetClass assetClass,
            List<AssetImportMessageResponse> errors,
            List<AssetImportMessageResponse> warnings
    ) {
        if (assetClass == null) return;
        if (isBlank(row.classType())) {
            warnings.add(message("classType", "CLASS_TYPE_DEFAULTED", "Không nhập loại con; hệ thống sẽ dùng giá trị mặc định"));
            return;
        }
        if (assetClass == AssetClass.FIXED_ASSET && parseFixedAssetType(row.classType()) == null) {
            errors.add(message("classType", "INVALID_FIXED_ASSET_TYPE", "Loại tài sản cố định phải là Hữu hình hoặc Vô hình"));
        }
        if (assetClass == AssetClass.TOOL_EQUIPMENT && parseToolUsageType(row.classType()) == null) {
            errors.add(message("classType", "INVALID_TOOL_USAGE_TYPE", "Loại công cụ dụng cụ phải là SINGLE_USE hoặc MULTI_USE"));
        }
    }

    private void validateCatalogItem(
            AssetImportRowRequest row,
            AssetCategory category,
            List<AssetImportMessageResponse> errors,
            List<AssetImportMessageResponse> warnings
    ) {
        if (isBlank(row.catalogItemCode())) return;
        AssetCatalogItem catalogItem = catalogItems.findByItemCode(normalizeCode(row.catalogItemCode())).orElse(null);
        if (catalogItem == null) {
            errors.add(message("catalogItemCode", "CATALOG_ITEM_NOT_FOUND", "Không tìm thấy mẫu tài sản theo mã đã nhập"));
            return;
        }
        if (Boolean.FALSE.equals(catalogItem.getActive())) {
            errors.add(message("catalogItemCode", "CATALOG_ITEM_INACTIVE", "Mẫu tài sản đang ngưng sử dụng"));
        }
        if (category != null && catalogItem.getCategory() != null
                && !Objects.equals(catalogItem.getCategory().getId(), category.getId())) {
            errors.add(message("catalogItemCode", "CATALOG_CATEGORY_MISMATCH", "Mẫu tài sản không thuộc danh mục đã chọn"));
        }
        if (catalogItem.getCategory() == null) {
            warnings.add(message("catalogItemCode", "CATALOG_WITHOUT_CATEGORY", "Mẫu tài sản chưa gắn danh mục"));
        }
    }

    private void validateMoneyAndDates(
            AssetImportRowRequest row,
            List<AssetImportMessageResponse> errors,
            List<AssetImportMessageResponse> warnings
    ) {
        validateNonNegative(row.originalCost(), "originalCost", "Nguyên giá", errors);
        validateNonNegative(row.bookValue(), "bookValue", "Giá trị còn lại", errors);
        if (row.originalCost() != null && row.bookValue() != null
                && row.bookValue().compareTo(row.originalCost()) > 0) {
            warnings.add(message("bookValue", "BOOK_VALUE_GREATER_THAN_COST", "Giá trị còn lại đang lớn hơn nguyên giá"));
        }
        if (row.usefulLifeMonths() != null && row.usefulLifeMonths() <= 0) {
            errors.add(message("usefulLifeMonths", "INVALID_USEFUL_LIFE", "Thời gian sử dụng hữu ích phải lớn hơn 0 tháng"));
        }
        if (row.depreciationStartDate() != null && row.useDate() != null
                && row.depreciationStartDate().isBefore(row.useDate())) {
            warnings.add(message("depreciationStartDate", "DEPRECIATION_BEFORE_USE_DATE", "Ngày bắt đầu khấu hao đang trước ngày đưa vào sử dụng"));
        }
        int maxYear = Year.now().getValue() + 1;
        if (row.manufactureYear() != null && row.manufactureYear() > maxYear) {
            errors.add(message("manufactureYear", "INVALID_YEAR", "Năm sản xuất không hợp lệ"));
        }
        if (row.installationYear() != null && row.installationYear() > maxYear) {
            errors.add(message("installationYear", "INVALID_YEAR", "Năm lắp đặt/cài đặt không hợp lệ"));
        }
    }

    private void validateStatus(AssetImportRowRequest row, List<AssetImportMessageResponse> errors) {
        if (!isBlank(row.status()) && parseStatus(row.status()) == null) {
            errors.add(message("status", "INVALID_STATUS", "Trạng thái tài sản không hợp lệ"));
        }
    }

    private void validateNonNegative(
            BigDecimal value,
            String field,
            String label,
            List<AssetImportMessageResponse> errors
    ) {
        if (value != null && value.compareTo(BigDecimal.ZERO) < 0) {
            errors.add(message(field, "NEGATIVE_VALUE", label + " không được âm"));
        }
    }

    private ImportLookup resolveImportLookup(AssetImportRowRequest row) {
        AssetCategory category = assetCategories.findByCode(normalizeCode(row.categoryCode()))
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy danh mục " + row.categoryCode()));
        AssetCatalogItem catalogItem = isBlank(row.catalogItemCode())
                ? null
                : catalogItems.findByItemCode(normalizeCode(row.catalogItemCode()))
                        .orElseThrow(() -> new NoSuchElementException("Không tìm thấy mẫu tài sản " + row.catalogItemCode()));
        AssetClass assetClass = parseAssetClass(row.assetClass(), new ArrayList<>());
        return new ImportLookup(category, catalogItem, assetClass);
    }

    private AssetItem toAssetItem(AssetImportRowRequest row, ImportLookup lookup, String generatedAssetCode) {
        AssetItem item = new AssetItem();
        item.setAssetCode(generatedAssetCode);
        item.setName(trimToNull(row.name()));
        item.setAssetCategory(lookup.category());
        item.setCatalogItem(lookup.catalogItem());
        item.setCategory(lookup.category().getName());
        item.setAssetClass(lookup.assetClass() != null ? lookup.assetClass() : lookup.category().getAssetClass());
        if (item.getAssetClass() == AssetClass.FIXED_ASSET) {
            FixedAssetType type = parseFixedAssetType(row.classType());
            item.setFixedAssetType(type != null ? type : FixedAssetType.TANGIBLE);
        } else {
            ToolUsageType type = parseToolUsageType(row.classType());
            item.setToolUsageType(type != null ? type : ToolUsageType.MULTI_USE);
        }
        item.setSerialNumber(trimToNull(row.serialNumber()));
        item.setUseDate(row.useDate());
        item.setDepreciationStartDate(row.depreciationStartDate());
        item.setOriginalCost(row.originalCost());
        item.setPurchaseCost(row.originalCost());
        item.setBookValue(row.bookValue() != null ? row.bookValue() : row.originalCost());
        item.setResidualValue(row.bookValue() != null ? row.bookValue() : row.originalCost());
        item.setStatus(parseStatusOrDefault(row.status()));
        item.setDepreciationMethod(isBlank(row.depreciationMethod()) ? "STRAIGHT_LINE" : row.depreciationMethod().trim().toUpperCase());
        item.setUsefulLifeMonths(row.usefulLifeMonths());
        if (row.usefulLifeMonths() != null) {
            item.setUsefulLifeYears(Math.max(1, (int) Math.ceil(row.usefulLifeMonths() / 12.0)));
        }
        item.setManufactureYear(row.manufactureYear());
        item.setInstallationYear(row.installationYear());
        item.setCountryCode(trimToNull(row.countryCode()));
        item.setTechnicalDescription(trimToNull(row.technicalDescription()));
        item.setNotes(importNotes(row));
        return item;
    }

    private String nextAssetCode(AssetCategory category) {
        AssetCodeSequence sequence = assetCodeSequences.findWithLockByCategoryId(category.getId())
                .orElseGet(() -> assetCodeSequences.saveAndFlush(new AssetCodeSequence(category.getId())));
        long next = sequence.getCurrentNumber() == null ? 1L : sequence.getCurrentNumber() + 1L;
        String code = assetCode(category, next);
        while (assets.existsByAssetCode(code)) {
            next++;
            code = assetCode(category, next);
        }
        sequence.setCurrentNumber(next);
        assetCodeSequences.save(sequence);
        return code;
    }

    private String previewAssetCode(AssetCategory category, Map<Long, Long> previewCounters) {
        long current = assetCodeSequences.findById(category.getId())
                .map(AssetCodeSequence::getCurrentNumber)
                .orElse(0L);
        long offset = previewCounters.merge(category.getId(), 1L, Long::sum);
        return assetCode(category, current + offset);
    }

    private String assetCode(AssetCategory category, long number) {
        String prefix = normalizeCode(category.getCode()).replaceAll("[^A-Z0-9]+", "-");
        return "%s-%05d".formatted(prefix, number);
    }

    private AssetCategory resolveCategory(String categoryCode, List<AssetImportMessageResponse> errors) {
        if (isBlank(categoryCode)) return null;
        return assetCategories.findByCode(normalizeCode(categoryCode))
                .orElseGet(() -> {
                    errors.add(message("categoryCode", "CATEGORY_NOT_FOUND", "Không tìm thấy danh mục theo mã " + categoryCode));
                    return null;
                });
    }

    private AssetClass parseAssetClass(String raw, List<AssetImportMessageResponse> errors) {
        if (isBlank(raw)) return null;
        String normalized = normalizeEnum(raw);
        if ("TSCD".equals(normalized) || "TAI_SAN_CO_DINH".equals(normalized)) return AssetClass.FIXED_ASSET;
        if ("CCDC".equals(normalized) || "CONG_CU_DUNG_CU".equals(normalized)) return AssetClass.TOOL_EQUIPMENT;
        AssetClass parsed = parseEnumOrNull(AssetClass.class, normalized);
        if (parsed == null) {
            errors.add(message("assetClass", "INVALID_ASSET_CLASS", "Phân loại tài sản không hợp lệ"));
        }
        return parsed;
    }

    private FixedAssetType parseFixedAssetType(String raw) {
        if (isBlank(raw)) return null;
        String normalized = normalizeEnum(raw);
        if ("HUU_HINH".equals(normalized) || "TSCD_HUU_HINH".equals(normalized)) return FixedAssetType.TANGIBLE;
        if ("VO_HINH".equals(normalized) || "TSCD_VO_HINH".equals(normalized)) return FixedAssetType.INTANGIBLE;
        return parseEnumOrNull(FixedAssetType.class, normalized);
    }

    private ToolUsageType parseToolUsageType(String raw) {
        if (isBlank(raw)) return null;
        String normalized = normalizeEnum(raw);
        if ("CCDC_DUNG_1_LAN".equals(normalized) || "DUNG_1_LAN".equals(normalized)) return ToolUsageType.SINGLE_USE;
        if ("CCDC_DUNG_NHIEU_LAN".equals(normalized) || "DUNG_NHIEU_LAN".equals(normalized)) return ToolUsageType.MULTI_USE;
        return parseEnumOrNull(ToolUsageType.class, normalized);
    }

    private AssetStatus parseStatusOrDefault(String raw) {
        AssetStatus parsed = parseStatus(raw);
        return parsed == null ? AssetStatus.IN_STOCK : parsed;
    }

    private AssetStatus parseStatus(String raw) {
        return parseEnumOrNull(AssetStatus.class, normalizeEnum(raw));
    }

    private <E extends Enum<E>> E parseEnumOrNull(Class<E> type, String raw) {
        try {
            return StatusParser.parseOrNull(type, raw);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private String importNotes(AssetImportRowRequest row) {
        List<String> notes = new ArrayList<>();
        if (!isBlank(row.departmentName())) notes.add("Phòng ban import: " + row.departmentName().trim());
        if (!isBlank(row.siteName())) notes.add("Chi nhánh import: " + row.siteName().trim());
        return notes.isEmpty() ? null : String.join("; ", notes);
    }

    private AssetImportRowResult withStatus(AssetImportRowResult row, String status, String generatedAssetCode) {
        return new AssetImportRowResult(
                row.rowNumber(),
                status,
                row.assetName(),
                row.categoryCode(),
                generatedAssetCode,
                row.errors(),
                row.warnings()
        );
    }

    private AssetImportMessageResponse message(String field, String code, String message) {
        return new AssetImportMessageResponse(field, code, message);
    }

    private int rowNumber(AssetImportRowRequest row) {
        return row.rowNumber() == null ? 0 : row.rowNumber();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String trimToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private String normalizeCode(String value) {
        return trimToNull(value) == null ? "" : value.trim().toUpperCase();
    }

    private String normalizeEnum(String value) {
        if (isBlank(value)) return null;
        return java.text.Normalizer.normalize(value.trim(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase();
    }

    private record ImportLookup(AssetCategory category, AssetCatalogItem catalogItem, AssetClass assetClass) {}

    private void applyAsset(AssetItem item, AssetRequest req) {
        item.setAssetCode(req.assetCode());
        item.setName(req.name());
        AssetCatalogItem catalogItem = req.catalogItemId() == null
                ? null
                : catalogItems.findById(req.catalogItemId())
                        .orElseThrow(() -> new NoSuchElementException("Danh mục vật tư không tồn tại"));
        AssetCategory assetCategory = req.categoryId() == null
                ? null
                : assetCategories.findById(req.categoryId())
                        .orElseThrow(() -> new NoSuchElementException("Nhóm tài sản không tồn tại"));
        item.setCatalogItem(catalogItem);
        item.setAssetCategory(assetCategory);
        item.setParentAsset(req.parentAssetId() == null ? null : getAssetById(req.parentAssetId()));
        item.setCategory(req.category());
        AssetClass assetClass = StatusParser.parseOrNull(AssetClass.class, req.assetClass());
        if (assetClass == null && assetCategory != null) {
            assetClass = assetCategory.getAssetClass();
        }
        if (assetClass != null) item.setAssetClass(assetClass);
        FixedAssetType fixedAssetType = StatusParser.parseOrNull(FixedAssetType.class, req.fixedAssetType());
        if (fixedAssetType != null) item.setFixedAssetType(fixedAssetType);
        ToolUsageType toolUsageType = StatusParser.parseOrNull(ToolUsageType.class, req.toolUsageType());
        if (toolUsageType != null) item.setToolUsageType(toolUsageType);
        item.setSerialNumber(req.serialNumber());
        item.setSource(req.source());
        item.setVendor(req.vendorId() == null ? null : vendorService.getVendor(req.vendorId()));
        item.setAssignedEmployeeId(req.assignedEmployeeId());
        item.setDepartmentId(req.departmentId());
        item.setSiteId(req.siteId());
        item.setProjectId(req.projectId());
        item.setUseDate(req.useDate());
        item.setDepreciationStartDate(req.depreciationStartDate());
        item.setOriginalCost(req.originalCost());
        item.setPurchaseCost(req.purchaseCost());
        item.setAccumulatedDepreciation(req.accumulatedDepreciation());
        item.setBookValue(req.bookValue());
        item.setResidualValue(req.residualValue());
        item.setPurchaseDate(req.purchaseDate());
        item.setWarrantyUntil(req.warrantyUntil());
        AssetStatus parsed = StatusParser.parseOrNull(AssetStatus.class, req.status());
        if (parsed != null) item.setStatus(parsed);
        item.setDepreciationMethod(req.depreciationMethod());
        item.setUsefulLifeMonths(req.usefulLifeMonths());
        item.setUsefulLifeYears(req.usefulLifeYears());
        item.setDepreciationRate(req.depreciationRate());
        item.setManufactureYear(req.manufactureYear());
        item.setInstallationYear(req.installationYear());
        item.setCountryCode(req.countryCode());
        item.setCapacity(req.capacity());
        item.setCapacityUnit(req.capacityUnit());
        item.setRealCapacity(req.realCapacity());
        item.setTechnicalDescription(req.technicalDescription());
        item.setNotes(req.notes());
    }

    @Transactional
    public AssetItem disposeAsset(Long id, DisposeAssetRequest req) {
        AssetItem item = getAssetById(id);
        if (item.getStatus() == AssetStatus.DISPOSED) {
            throw new IllegalStateException("Tài sản đã được thanh lý");
        }
        item.setStatus(AssetStatus.DISPOSED);
        item.setDisposalDate(req.disposalDate());
        item.setDisposalPrice(req.disposalPrice());
        item.setDisposalReason(req.disposalReason());
        item.setAssignedEmployeeId(null);
        return assets.save(item);
    }

    @Transactional(readOnly = true)
    public DepreciationSnapshot calculateDepreciation(Long id) {
        return calculateDepreciation(getAssetById(id));
    }

    public DepreciationSnapshot calculateDepreciation(AssetItem item) {
        Long id = item.getId();
        BigDecimal cost = item.getPurchaseCost() == null ? BigDecimal.ZERO : item.getPurchaseCost();
        BigDecimal residual = item.getResidualValue() == null ? cost : item.getResidualValue();
        Integer life = item.getUsefulLifeYears();
        String method = item.getDepreciationMethod() == null ? "NONE" : item.getDepreciationMethod();

        if (life == null || life <= 0 || "NONE".equals(method) || item.getPurchaseDate() == null) {
            return new DepreciationSnapshot(id, method, life, cost, residual,
                    BigDecimal.ZERO, BigDecimal.ZERO, cost, 0);
        }

        int yearsElapsed = Math.max(0, Period.between(item.getPurchaseDate(), LocalDate.now()).getYears());
        BigDecimal depreciable = cost.subtract(residual);
        BigDecimal annual;
        BigDecimal accumulated;
        BigDecimal bookValue;

        if ("DECLINING_BALANCE".equals(method)) {
            BigDecimal rate = BigDecimal.valueOf(2).divide(BigDecimal.valueOf(life), 8, RoundingMode.HALF_UP);
            BigDecimal current = cost;
            int years = Math.min(yearsElapsed, life);
            for (int i = 0; i < years; i++) {
                BigDecimal step = current.multiply(rate).setScale(2, RoundingMode.HALF_UP);
                BigDecimal next = current.subtract(step);
                if (next.compareTo(residual) < 0) {
                    step = current.subtract(residual);
                    next = residual;
                }
                current = next;
            }
            bookValue = current;
            accumulated = cost.subtract(bookValue);
            annual = cost.multiply(rate).setScale(2, RoundingMode.HALF_UP);
        } else {
            annual = depreciable.divide(BigDecimal.valueOf(life), 2, RoundingMode.HALF_UP);
            int years = Math.min(yearsElapsed, life);
            accumulated = annual.multiply(BigDecimal.valueOf(years));
            bookValue = cost.subtract(accumulated);
            if (bookValue.compareTo(residual) < 0) bookValue = residual;
        }

        return new DepreciationSnapshot(id, method, life, cost, residual, annual, accumulated, bookValue, yearsElapsed);
    }

    @Transactional(readOnly = true)
    public List<AssetItem> listAssetsWithWarrantyExpiringWithin(int days) {
        LocalDate cutoff = LocalDate.now().plusDays(days);
        LocalDate today = LocalDate.now();
        return assets.findAll().stream()
                .filter(a -> a.getWarrantyUntil() != null)
                .filter(a -> !a.getWarrantyUntil().isBefore(today))
                .filter(a -> !a.getWarrantyUntil().isAfter(cutoff))
                .filter(a -> a.getStatus() != AssetStatus.DISPOSED)
                .toList();
    }

    @Transactional(readOnly = true)
    public UtilizationReportResponse getUtilizationReport() {
        List<AssetItem> all = assets.findAll();
        long total = all.size();
        long assigned = all.stream().filter(a -> a.getStatus() == AssetStatus.ASSIGNED).count();
        long inStock = all.stream().filter(a -> a.getStatus() == AssetStatus.IN_STOCK).count();
        long maintenance = all.stream().filter(a -> a.getStatus() == AssetStatus.MAINTENANCE).count();
        long disposed = all.stream().filter(a -> a.getStatus() == AssetStatus.DISPOSED).count();
        long active = total - disposed;
        double rate = active > 0 ? (double) assigned * 100.0 / active : 0.0;

        BigDecimal totalValue = all.stream()
                .filter(a -> a.getStatus() != AssetStatus.DISPOSED)
                .map(a -> a.getPurchaseCost() == null ? BigDecimal.ZERO : a.getPurchaseCost())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal idleValue = all.stream()
                .filter(a -> a.getStatus() == AssetStatus.IN_STOCK)
                .map(a -> a.getPurchaseCost() == null ? BigDecimal.ZERO : a.getPurchaseCost())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // enum.name() keeps JSON shape stable for FE (Map<String,Long>).
        Map<String, Long> byStatus = all.stream()
                .collect(Collectors.groupingBy(a -> a.getStatus().name(), Collectors.counting()));
        Map<String, Long> byCategory = all.stream()
                .filter(a -> a.getStatus() != AssetStatus.DISPOSED)
                .collect(Collectors.groupingBy(
                        a -> a.getCategory() != null
                                ? a.getCategory()
                                : a.getAssetCategory() != null ? a.getAssetCategory().getName() : "UNCLASSIFIED",
                        Collectors.counting()));

        return new UtilizationReportResponse(
                total, assigned, inStock, maintenance, disposed,
                Math.round(rate * 100.0) / 100.0,
                totalValue, idleValue, byStatus, byCategory
        );
    }
}
