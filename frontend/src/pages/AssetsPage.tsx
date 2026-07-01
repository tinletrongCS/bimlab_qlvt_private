import { type ChangeEvent, type MouseEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiDownload,
  FiEye,
  FiFileText,
  FiGrid,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";
import { PanelHeader } from "../components/PanelHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useActions } from "../contexts/ActionsContext";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import { employeeLabel, money, projectLabel } from "../lib/format";
import {
  commitAssetImport,
  deleteAsset,
  loadAssetCategoryTree,
  updateAsset,
  validateAssetImport,
} from "../services/api";
import type {
  AssetCategoryTree,
  AssetImportCommitPayload,
  AssetImportRowPayload,
  AssetImportValidationResponse,
  AssetItem,
  AssetPayload,
} from "../services/types";

type AssetStatusFilter = "ALL" | "IN_STOCK" | "ASSIGNED" | "MAINTENANCE" | "DISPOSED";
type AssetValueFilter = "ALL" | "UNDER_10M" | "FROM_10M_TO_50M" | "FROM_50M_TO_200M" | "FROM_200M";
type ImportMode = AssetImportCommitPayload["importMode"];
type ImportPreviewFilter = "ALL" | "VALID" | "INVALID" | "WARNING";

const ASSET_VALUE_FILTERS: Array<{
  value: AssetValueFilter;
  label: string;
  min?: number;
  max?: number;
}> = [
  { value: "ALL", label: "Tất cả giá trị" },
  { value: "UNDER_10M", label: "Dưới 10 triệu", max: 10_000_000 },
  { value: "FROM_10M_TO_50M", label: "10 - 50 triệu", min: 10_000_000, max: 50_000_000 },
  { value: "FROM_50M_TO_200M", label: "50 - 200 triệu", min: 50_000_000, max: 200_000_000 },
  { value: "FROM_200M", label: "Trên 200 triệu", min: 200_000_000 },
];
type SheetCell = string | number | boolean | Date | null | undefined;
type SheetRow = SheetCell[];

function statusLabel(status: AssetStatusFilter) {
  const labels: Record<AssetStatusFilter, string> = {
    ALL: "Tất cả trạng thái",
    IN_STOCK: "Trong kho",
    ASSIGNED: "Đã cấp phát",
    MAINTENANCE: "Bảo trì",
    DISPOSED: "Đã thanh lý",
  };
  return labels[status];
}

function collectCategoryIds(node: AssetCategoryTree): Set<number> {
  const ids = new Set<number>([node.id]);
  node.children.forEach((child) => {
    collectCategoryIds(child).forEach((id) => {
      ids.add(id);
    });
  });
  return ids;
}

function findCategoryPath(nodes: AssetCategoryTree[], path: string[]): AssetCategoryTree[] {
  const result: AssetCategoryTree[] = [];
  let current = nodes;
  for (const rawId of path) {
    const node = current.find((item) => String(item.id) === rawId);
    if (!node) break;
    result.push(node);
    current = node.children;
  }
  return result;
}

function findCategoryIdPath(
  nodes: AssetCategoryTree[],
  targetId: number,
  path: string[] = [],
): string[] {
  for (const node of nodes) {
    const nextPath = [...path, String(node.id)];
    if (node.id === targetId) return nextPath;
    const childPath = findCategoryIdPath(node.children, targetId, nextPath);
    if (childPath.length > 0) return childPath;
  }
  return [];
}

function buildAssetPayload(item: AssetItem): AssetPayload {
  return {
    assetCode: item.assetCode,
    name: item.name,
    category: item.assetCategory?.name || item.category || "",
    serialNumber: item.serialNumber || "",
    source: item.source || "",
    vendorId: item.vendor?.id ?? null,
    assignedEmployeeId: item.assignedEmployeeId ?? null,
    departmentId: item.departmentId ?? null,
    siteId: item.siteId ?? null,
    projectId: item.projectId ?? null,
    purchaseCost: item.purchaseCost ?? item.originalCost ?? null,
    residualValue: item.residualValue ?? item.bookValue ?? null,
    purchaseDate: item.purchaseDate || "",
    warrantyUntil: item.warrantyUntil || "",
    status: item.status,
    depreciationMethod: item.depreciationMethod || "",
    usefulLifeYears:
      item.usefulLifeYears ??
      (item.usefulLifeMonths ? Math.round(item.usefulLifeMonths / 12) : null),
    notes: item.notes || "",
    catalogItemId: item.catalogItem?.id ?? null,
    categoryId: item.assetCategory?.id ?? null,
    parentAssetId: item.parentAsset?.id ?? null,
    assetClass: item.assetClass || "",
    fixedAssetType: item.fixedAssetType || "",
    toolUsageType: item.toolUsageType || "",
    useDate: item.useDate || "",
    depreciationStartDate: item.depreciationStartDate || "",
    originalCost: item.originalCost ?? item.purchaseCost ?? null,
    accumulatedDepreciation: item.accumulatedDepreciation ?? null,
    bookValue: item.bookValue ?? item.residualValue ?? null,
    usefulLifeMonths: item.usefulLifeMonths ?? null,
    depreciationRate: item.depreciationRate ?? null,
    manufactureYear: item.manufactureYear ?? null,
    installationYear: item.installationYear ?? null,
    countryCode: item.countryCode || "",
    capacity: item.capacity ?? null,
    capacityUnit: item.capacityUnit || "",
    realCapacity: item.realCapacity ?? null,
    technicalDescription: item.technicalDescription || "",
  };
}

function optionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function classLabel(value?: string) {
  if (!value) return "Chưa phân loại";
  const labels: Record<string, string> = {
    FIXED_ASSET: "Tài sản cố định",
    TOOL_EQUIPMENT: "Công cụ dụng cụ",
    TANGIBLE: "Hữu hình",
    INTANGIBLE: "Vô hình",
    SINGLE_USE: "Dùng một lần",
    MULTI_USE: "Dùng nhiều lần",
  };
  return labels[value] || value;
}

function highlightSearchText(value: string, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return value;
  const lower = value.toLowerCase();
  const index = lower.indexOf(normalizedQuery);
  if (index < 0) return value;
  return (
    <>
      {value.slice(0, index)}
      <mark className="search-match">{value.slice(index, index + normalizedQuery.length)}</mark>
      {value.slice(index + normalizedQuery.length)}
    </>
  );
}

function importStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    VALID: "Hợp lệ",
    INVALID: "Lỗi",
    WARNING: "Cảnh báo",
    IMPORTED: "Đã nhập",
    SKIPPED: "Bỏ qua",
  };
  return status ? labels[status] || status : "Chưa kiểm tra";
}

function dateTimeLabel(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN");
}

function dateKey(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  const normalized = value.trim();
  return normalized.length >= 10 ? normalized.slice(0, 10) : normalized;
}

function assetCategoryTokens(asset: AssetItem): Set<string> {
  return new Set(
    [
      asset.category,
      asset.assetCategory?.name,
      asset.assetCategory?.code,
      asset.assetClass,
      asset.fixedAssetType,
      asset.toolUsageType,
      classLabel(asset.assetClass),
      classLabel(asset.fixedAssetType),
      classLabel(asset.toolUsageType),
    ]
      .filter(Boolean)
      .map((value) => normalize(String(value))),
  );
}

function categoryNodeTerms(node: AssetCategoryTree): Set<string> {
  const name = normalize(node.name);
  const code = normalize(node.code);
  const source = `${name} ${code}`;
  const terms = new Set([name, code].filter(Boolean));

  if (
    source.includes("fixed_asset") ||
    source.includes("tscd") ||
    source.includes("tai san co dinh")
  ) {
    terms.add("fixed_asset");
    terms.add("tai san co dinh");
  }
  if (
    source.includes("tool_equipment") ||
    source.includes("ccdc") ||
    source.includes("cong cu dung cu")
  ) {
    terms.add("tool_equipment");
    terms.add("cong cu dung cu");
  }
  if (source.includes("intangible") || source.includes("vo hinh")) {
    terms.add("intangible");
    terms.add("vo hinh");
  } else if (source.includes("tangible") || source.includes("huu hinh")) {
    terms.add("tangible");
    terms.add("huu hinh");
  }
  if (
    source.includes("single_use") ||
    source.includes("dung mot lan") ||
    source.includes("dung 1 lan")
  ) {
    terms.add("single_use");
    terms.add("dung mot lan");
  }
  if (source.includes("multi_use") || source.includes("dung nhieu lan")) {
    terms.add("multi_use");
    terms.add("dung nhieu lan");
  }

  return terms;
}

function assetMatchesCategoryNode(
  asset: AssetItem,
  node: AssetCategoryTree,
  descendantIds?: Set<number> | null,
) {
  const assetCategoryId = asset.assetCategory?.id;
  if (assetCategoryId && descendantIds?.has(assetCategoryId)) return true;
  const tokens = assetCategoryTokens(asset);
  const nodeTerms = categoryNodeTerms(node);
  return Array.from(nodeTerms).some((term) => tokens.has(term));
}

function AssetCategoryFilterNode({
  node,
  depth = 0,
  selectedId,
  selectedPathIds,
  expandedIds,
  assetCounts,
  onSelect,
  onToggle,
}: {
  node: AssetCategoryTree;
  depth?: number;
  selectedId?: number;
  selectedPathIds: Set<number>;
  expandedIds: Set<number>;
  assetCounts: Map<number, number>;
  onSelect: (category: AssetCategoryTree) => void;
  onToggle: (id: number) => void;
}) {
  const count = assetCounts.get(node.id) ?? 0;
  const hasChildren = node.children.length > 0;
  const open = expandedIds.has(node.id) || (selectedPathIds.has(node.id) && selectedId !== node.id);

  return (
    <div className="asset-category-filter-node">
      <button
        type="button"
        className="asset-category-filter-item"
        data-selected={selectedId === node.id ? "true" : undefined}
        style={{ paddingLeft: 8 + depth * 8 }}
        onClick={() => {
          onSelect(node);
          if (hasChildren) onToggle(node.id);
        }}
      >
        {hasChildren ? (
          <FiChevronRight className={`asset-category-filter-arrow ${open ? "open" : ""}`} />
        ) : (
          <span className="asset-category-filter-spacer" />
        )}
        <span className="asset-category-filter-copy">
          <strong>{node.name}</strong>
          <small>{node.code}</small>
        </span>
        <span className="asset-category-filter-count">{count}</span>
      </button>

      {hasChildren && open && (
        <div className="asset-category-filter-children">
          {node.children.map((child) => (
            <AssetCategoryFilterNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              selectedPathIds={selectedPathIds}
              expandedIds={expandedIds}
              assetCounts={assetCounts}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  if (total === 0) return null;

  return (
    <div className="table-pagination asset-list-pagination">
      <div className="table-pagination-summary">
        Hiển thị <strong>{start}-{end}</strong> / <strong>{total}</strong> tài sản
      </div>
      <div className="table-pagination-controls">
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          aria-label="Số dòng mỗi trang"
        >
          {[10, 20, 50, 100].map((option) => (
            <option key={option} value={option}>
              {option}/trang
            </option>
          ))}
        </select>
        <button type="button" onClick={() => onPageChange(1)} disabled={safePage <= 1}>
          <FiChevronsLeft />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
        >
          <FiChevronLeft />
        </button>
        <span>
          {safePage} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, safePage + 1))}
          disabled={safePage >= pageCount}
        >
          <FiChevronRight />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(pageCount)}
          disabled={safePage >= pageCount}
        >
          <FiChevronsRight />
        </button>
      </div>
    </div>
  );
}

function cellText(value: SheetCell): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function readText(row: SheetRow, index: number): string {
  if (index < 0) return "";
  return cellText(row[index]);
}

function readNumber(row: SheetRow, index: number): number | null {
  const raw = row[index];
  if (typeof raw === "number") return raw;
  const value = cellText(raw);
  if (!value) return null;
  const cleaned = value.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/\.(?=\d{3}(\D|$))/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function readInteger(row: SheetRow, index: number): number | null {
  const parsed = readNumber(row, index);
  return parsed === null ? null : Math.trunc(parsed);
}

function readDate(row: SheetRow, index: number): string | undefined {
  const raw = row[index];
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  if (typeof raw === "number") {
    const date = new Date(Date.UTC(1899, 11, 30) + raw * 86400000);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
  }
  const value = cellText(raw);
  if (!value) return undefined;
  const iso = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const vi = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (vi) {
    const [, day, month, year] = vi;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return value;
}

function normalizeAssetClass(value: string): string | undefined {
  const text = normalize(value);
  if (!text) return undefined;
  if (text.includes("ccdc") || text.includes("cong cu")) return "TOOL_EQUIPMENT";
  if (text.includes("tscd") || text.includes("tai san co dinh")) return "FIXED_ASSET";
  const upper = value.trim().toUpperCase();
  if (upper === "FIXED_ASSET" || upper === "TOOL_EQUIPMENT") return upper;
  return value.trim();
}

function normalizeClassType(value: string): string | undefined {
  const text = normalize(value);
  if (!text) return undefined;
  if (text.includes("vo hinh") || text.includes("intangible")) return "INTANGIBLE";
  if (text.includes("huu hinh") || text.includes("tangible")) return "TANGIBLE";
  if (text.includes("1 lan") || text.includes("mot lan") || text.includes("single")) {
    return "SINGLE_USE";
  }
  if (text.includes("nhieu lan") || text.includes("multi")) return "MULTI_USE";
  return value.trim().toUpperCase();
}

function normalizeStatus(value: string): string | undefined {
  const text = normalize(value);
  if (!text) return undefined;
  if (text.includes("trong kho")) return "IN_STOCK";
  if (text.includes("cap phat") || text.includes("dang su dung")) return "ASSIGNED";
  if (text.includes("bao tri")) return "MAINTENANCE";
  if (text.includes("thanh ly")) return "DISPOSED";
  if (text.includes("mat")) return "LOST";
  return value.trim().toUpperCase();
}

function extractCategoryCode(value: string): string | undefined {
  const code = value.split("(")[0].trim().split(/\s+/)[0];
  return code || undefined;
}

async function parseAssetImportFile(file: File): Promise<AssetImportRowPayload[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheetName =
    workbook.SheetNames.find((name) => normalize(name) === "hosotaisan_import") ??
    workbook.SheetNames[0];
  if (!sheetName) throw new Error("File không có sheet dữ liệu.");

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: true,
  });
  const keyRowIndex = rows.findIndex((row) => {
    const keys = row.map(cellText);
    return keys.includes("assets.asset_code") && keys.includes("assets.name");
  });
  if (keyRowIndex < 0) {
    throw new Error("Không tìm thấy dòng mapping cột assets.asset_code/assets.name.");
  }

  const keyRow = rows[keyRowIndex].map(cellText);
  const findColumn = (matcher: (key: string) => boolean) => keyRow.findIndex(matcher);
  const assetCodeIndex = findColumn((key) => key === "assets.asset_code");
  const nameIndex = findColumn((key) => key === "assets.name");
  const assetClassIndex = findColumn((key) => key === "assets.asset_class");
  const classTypeIndex = findColumn((key) => key.includes("fixed_asset_type"));
  const categoryIndex = findColumn((key) => key.includes("asset_categories.code"));
  const departmentIndex = findColumn((key) => key === "assets.department_id");
  const siteIndex = findColumn((key) => key === "assets.site_id");
  const catalogItemIndex = findColumn((key) => key === "catalog_item_code");
  const depreciationMethodIndex = findColumn((key) => key === "depreciation_method");
  const serialIndex = findColumn((key) => key === "series_mac_number" || key === "serial_number");
  const depreciationStartIndex = findColumn((key) => key === "depreciation_start_date");
  const useDateIndex = findColumn((key) => key === "use_date");
  const usefulLifeMonthsIndex = findColumn((key) => key === "useful_life_months");
  const originalCostIndex = findColumn((key) => key === "original_cost");
  const bookValueIndex = findColumn((key) => key === "book_value");
  const statusIndex = findColumn((key) => key === "status");
  const countryIndex = findColumn((key) => key === "country_code");
  const manufactureYearIndex = findColumn((key) => key === "manufacture_year");
  const installationYearIndex = findColumn((key) => key === "installation_year");
  const technicalDescriptionIndex = findColumn((key) => key === "technical_description");

  const parsedRows: AssetImportRowPayload[] = [];
  const dataStartIndex = keyRowIndex + 2;
  for (let index = dataStartIndex; index < rows.length; index += 1) {
    const row = rows[index];
    const assetClass = normalizeAssetClass(readText(row, assetClassIndex));
    const name = readText(row, nameIndex);
    const categoryCode = extractCategoryCode(readText(row, categoryIndex));
    const hasData = Boolean(
      name ||
        assetClass ||
        categoryCode ||
        readText(row, classTypeIndex) ||
        readText(row, departmentIndex) ||
        readText(row, siteIndex),
    );
    if (!hasData) {
      if (parsedRows.length > 0) break;
      continue;
    }

    parsedRows.push({
      rowNumber: index + 1,
      assetCode: readText(row, assetCodeIndex) || undefined,
      name: name || undefined,
      assetClass,
      classType: normalizeClassType(readText(row, classTypeIndex)),
      categoryCode,
      departmentName: readText(row, departmentIndex) || undefined,
      siteName: readText(row, siteIndex) || undefined,
      catalogItemCode: readText(row, catalogItemIndex) || undefined,
      depreciationMethod: readText(row, depreciationMethodIndex) || undefined,
      serialNumber: readText(row, serialIndex) || undefined,
      depreciationStartDate: readDate(row, depreciationStartIndex),
      useDate: readDate(row, useDateIndex),
      usefulLifeMonths: readInteger(row, usefulLifeMonthsIndex),
      originalCost: readNumber(row, originalCostIndex),
      bookValue: readNumber(row, bookValueIndex),
      status: normalizeStatus(readText(row, statusIndex)),
      countryCode: readText(row, countryIndex) || undefined,
      manufactureYear: readInteger(row, manufactureYearIndex),
      installationYear: readInteger(row, installationYearIndex),
      technicalDescription: readText(row, technicalDescriptionIndex) || undefined,
    });
  }

  if (parsedRows.length === 0) throw new Error("Không tìm thấy dòng tài sản nào để import.");
  return parsedRows;
}

function downloadImportCsv(result: AssetImportValidationResponse) {
  const header = [
    "Dong Excel",
    "Trang thai",
    "Ten tai san",
    "Danh muc",
    "Ma tai san du kien",
    "Loi",
    "Canh bao",
  ];
  const escapeCsvCell = (value: string | number | null | undefined) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [
    header.map(escapeCsvCell).join(","),
    ...result.rows.map((row) =>
      [
        row.rowNumber,
        row.status,
        row.assetName,
        row.categoryCode,
        row.generatedAssetCodePreview,
        row.errors.map((item) => `${item.code}: ${item.message}`).join("; "),
        row.warnings.map((item) => `${item.code}: ${item.message}`).join("; "),
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ];
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ket-qua-import-tai-san.csv";
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadAssetImportTemplate() {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BIMLab QLVT";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("HoSoTaiSan_import", {
    views: [{ state: "frozen", ySplit: 4 }],
  });
  const lookup = workbook.addWorksheet("DanhMuc_ThamChieu");

  const fieldKeys = [
    "assets.asset_code",
    "assets.name",
    "assets.asset_class",
    "assets.fixed_asset_type/assets.tool_usage_type",
    "assets.category_id/asset_categories.code",
    "assets.department_id",
    "assets.site_id",
    "catalog_item_code",
    "depreciation_method",
    "series_mac_number",
    "depreciation_start_date",
    "use_date",
    "useful_life_months",
    "original_cost",
    "book_value",
    "status",
    "country_code",
    "manufacture_year",
    "installation_year",
    "technical_description",
  ];
  const headers = [
    "Mã tài sản",
    "Tên tài sản*",
    "Phân loại*",
    "Phân loại lớp con*",
    "Danh mục tài sản*",
    "Phòng ban",
    "Chi nhánh",
    "Mẫu tài sản",
    "Phương pháp khấu hao",
    "Số Series/MAC",
    "Ngày bắt đầu khấu hao",
    "Ngày sử dụng",
    "Số tháng",
    "Nguyên giá tài sản",
    "Giá trị sổ sách",
    "Trạng thái tài sản",
    "Mã quốc gia/Xuất xứ",
    "Năm sản xuất",
    "Năm lắp đặt/Cài đặt",
    "Mô tả kỹ thuật",
  ];
  const examples = [
    "MONITOR-00001",
    "Màn hình ASUS",
    "FIXED_ASSET",
    "TANGIBLE",
    "MONITOR",
    "CNTT - Marketing",
    "BIMLab",
    "MONITOR_DELL_24_HD",
    "STRAIGHT_LINE",
    "SN-MAC-001",
    "2026-01-01",
    "2026-01-05",
    36,
    6000000,
    6000000,
    "Trong kho",
    "VN",
    2025,
    2026,
    "Màn hình 24 inch, Full HD",
  ];

  sheet.addRow([
    "Không bắt buộc nhập mã tài sản. Nếu để trống, hệ thống sẽ tự sinh theo danh mục node lá.",
    "Quy ước phân loại: nhập mã FIXED_ASSET hoặc TOOL_EQUIPMENT.",
    "Cấp cao nhất.",
    "Phân loại lớp con: TANGIBLE, INTANGIBLE, SINGLE_USE hoặc MULTI_USE.",
    "Nhập chính xác mã danh mục node lá, ví dụ MONITOR, LAPTOP, LICENSE.",
  ]);
  sheet.addRow(fieldKeys);
  sheet.addRow(headers);
  sheet.addRow(examples);
  sheet.addRow([]);

  sheet.mergeCells("A1:T1");
  const noteCell = sheet.getCell("A1");
  noteCell.font = { name: "Be Vietnam Pro", size: 11, bold: true, color: { argb: "FF154D7C" } };
  noteCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
  noteCell.alignment = { vertical: "middle", wrapText: true };
  noteCell.border = {
    top: { style: "thin", color: { argb: "FFBFDBFE" } },
    left: { style: "thin", color: { argb: "FFBFDBFE" } },
    bottom: { style: "thin", color: { argb: "FFBFDBFE" } },
    right: { style: "thin", color: { argb: "FFBFDBFE" } },
  };
  sheet.getRow(1).height = 34;

  sheet.getRow(2).height = 24;
  sheet.getRow(2).eachCell((cell) => {
    cell.font = { name: "Be Vietnam Pro", size: 10, color: { argb: "FF64748B" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };
  });

  sheet.getRow(3).height = 42;
  sheet.getRow(3).eachCell((cell) => {
    cell.font = { name: "Be Vietnam Pro", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF154D7C" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF154D7C" } },
      left: { style: "thin", color: { argb: "FF93C5FD" } },
      bottom: { style: "thin", color: { argb: "FF154D7C" } },
      right: { style: "thin", color: { argb: "FF93C5FD" } },
    };
  });

  sheet.getRow(4).eachCell((cell) => {
    cell.font = { name: "Be Vietnam Pro", size: 11, color: { argb: "FF111827" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });

  const widths = [16, 28, 16, 24, 22, 22, 18, 24, 20, 20, 22, 18, 12, 18, 18, 18, 18, 14, 18, 36];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  for (let rowIndex = 5; rowIndex <= 200; rowIndex += 1) {
    sheet.getCell(`C${rowIndex}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"FIXED_ASSET,TOOL_EQUIPMENT"'],
      showErrorMessage: true,
      errorTitle: "Sai phân loại",
      error: "Chọn FIXED_ASSET hoặc TOOL_EQUIPMENT.",
    };
    sheet.getCell(`D${rowIndex}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"TANGIBLE,INTANGIBLE,SINGLE_USE,MULTI_USE"'],
      showErrorMessage: true,
      errorTitle: "Sai phân loại lớp con",
      error: "Chọn một giá trị trong danh sách.",
    };
    sheet.getCell(`I${rowIndex}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"STRAIGHT_LINE,DECLINING_BALANCE,NONE"'],
    };
    sheet.getCell(`P${rowIndex}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"IN_STOCK,ASSIGNED,MAINTENANCE,DISPOSED,LOST,PENDING"'],
    };
  }

  sheet.autoFilter = "A3:T3";
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.font = { name: "Be Vietnam Pro", size: cell.font?.size ?? 11, ...cell.font };
    });
  });

  lookup.columns = [
    { header: "Nhóm", key: "group", width: 24 },
    { header: "Mã/Giá trị nhập", key: "code", width: 28 },
    { header: "Diễn giải", key: "label", width: 46 },
    { header: "Danh mục cha", key: "parentCode", width: 28 },
  ];
  [
    ["Phân loại", "FIXED_ASSET", "Tài sản cố định", ""],
    ["Phân loại", "TOOL_EQUIPMENT", "Công cụ dụng cụ", ""],
    ["Phân loại lớp con", "TANGIBLE", "Tài sản cố định hữu hình", "FIXED_ASSET"],
    ["Phân loại lớp con", "INTANGIBLE", "Tài sản cố định vô hình", "FIXED_ASSET"],
    ["Phân loại lớp con", "SINGLE_USE", "Công cụ dụng cụ sử dụng một lần", "TOOL_EQUIPMENT"],
    ["Phân loại lớp con", "MULTI_USE", "Công cụ dụng cụ sử dụng nhiều lần", "TOOL_EQUIPMENT"],
    ["Danh mục ví dụ", "IT_EQUIPMENT", "Thiết bị CNTT", "TANGIBLE"],
    ["Danh mục ví dụ", "MONITOR", "Màn hình", "IT_EQUIPMENT"],
    ["Danh mục ví dụ", "LAPTOP", "Laptop", "IT_EQUIPMENT"],
    ["Danh mục ví dụ", "PRINTER", "Máy in", "IT_EQUIPMENT"],
    ["Danh mục ví dụ", "OFFICE_EQUIPMENT", "Thiết bị văn phòng", "TANGIBLE"],
    ["Danh mục ví dụ", "CHAIR", "Ghế", "OFFICE_EQUIPMENT"],
    ["Danh mục ví dụ", "TABLE", "Bàn", "OFFICE_EQUIPMENT"],
    ["Danh mục ví dụ", "SOFTWARE", "Phần mềm", "INTANGIBLE"],
    ["Danh mục ví dụ", "LICENSE", "Bản quyền/phần mềm", "SOFTWARE"],
    ["Trạng thái", "IN_STOCK", "Trong kho", ""],
    ["Trạng thái", "ASSIGNED", "Đã cấp phát", ""],
    ["Trạng thái", "MAINTENANCE", "Bảo trì", ""],
    ["Trạng thái", "DISPOSED", "Đã thanh lý", ""],
    ["Trạng thái", "LOST", "Mất", ""],
    ["Trạng thái", "PENDING", "Chờ xử lý", ""],
  ].forEach(([group, code, label, parentCode]) => {
    lookup.addRow({ group, code, label, parentCode });
  });

  lookup.getRow(1).eachCell((cell) => {
    cell.font = { name: "Be Vietnam Pro", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF154D7C" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  lookup.eachRow((row, rowNumber) => {
    row.height = rowNumber === 1 ? 28 : 22;
    row.eachCell((cell) => {
      cell.font = {
        name: "Be Vietnam Pro",
        size: rowNumber === 1 ? 12 : 11,
        bold: rowNumber === 1,
        color: { argb: rowNumber === 1 ? "FFFFFFFF" : "FF111827" },
      };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE5E7EB" } } };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mau_import_danh_sach_tai_san_bimlab.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

export function AssetsPage() {
  const { hasPermission } = useAuth();
  const {
    assets,
    employees,
    departments,
    workSites,
    projects,
    ensureAssets,
    ensureAssetDetailLookups,
  } = useAppData();
  const { openModal } = useActions();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssetStatusFilter>("ALL");
  const [categoryPath, setCategoryPath] = useState<string[]>([]);
  const [expandedAssetCategoryIds, setExpandedAssetCategoryIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [categoryTree, setCategoryTree] = useState<AssetCategoryTree[]>([]);
  const [siteFilter, setSiteFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [useDateFrom, setUseDateFrom] = useState("");
  const [useDateTo, setUseDateTo] = useState("");
  const [valueFilter, setValueFilter] = useState<AssetValueFilter>("ALL");
  const [assetPage, setAssetPage] = useState(1);
  const [assetPageSize, setAssetPageSize] = useState(20);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [assetDraft, setAssetDraft] = useState<AssetPayload | null>(null);
  const [assetSaving, setAssetSaving] = useState(false);
  const [qrAsset, setQrAsset] = useState<AssetItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importCancelConfirm, setImportCancelConfirm] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importRows, setImportRows] = useState<AssetImportRowPayload[]>([]);
  const [importResult, setImportResult] = useState<AssetImportValidationResponse | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("VALID_ROWS_ONLY");
  const [importPreviewFilter, setImportPreviewFilter] = useState<ImportPreviewFilter>("ALL");
  const [importTooltip, setImportTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    void ensureAssets();
  }, [ensureAssets]);

  useEffect(() => {
    loadAssetCategoryTree()
      .then(setCategoryTree)
      .catch(() => setCategoryTree([]));
  }, []);

  const canManage = hasPermission("asset_manage");
  const employeeName = (id?: number) =>
    id ? employeeLabel(employees.find((employee) => employee.id === id)) : "Chưa gán người dùng";
  const departmentName = (id?: number) =>
    id ? departments.find((department) => department.id === id)?.name || `Phòng ban #${id}` : "—";
  const siteName = (id?: number) =>
    id ? workSites.find((site) => site.id === id)?.name || `Site #${id}` : "—";
  const projectName = (id?: number) =>
    id ? projectLabel(projects.find((project) => project.id === id)) : "—";

  const categoryDescendantIds = useMemo(() => {
    const idsByCategory = new Map<number, Set<number>>();
    const visit = (node: AssetCategoryTree): Set<number> => {
      const ids = new Set<number>([node.id]);
      node.children.forEach((child) => {
        visit(child).forEach((id) => {
          ids.add(id);
        });
      });
      idsByCategory.set(node.id, ids);
      return ids;
    };
    categoryTree.forEach(visit);
    return idsByCategory;
  }, [categoryTree]);

  const categoryAssetCounts = useMemo(() => {
    const counts = new Map<number, number>();
    const visit = (node: AssetCategoryTree) => {
      const descendantIds = categoryDescendantIds.get(node.id) ?? collectCategoryIds(node);
      const count = assets.filter((asset) =>
        assetMatchesCategoryNode(asset, node, descendantIds),
      ).length;
      counts.set(node.id, count);
      node.children.forEach(visit);
    };
    categoryTree.forEach(visit);
    return counts;
  }, [assets, categoryDescendantIds, categoryTree]);

  const resetAssetFilters = () => {
    setCategoryPath([]);
    setExpandedAssetCategoryIds(new Set());
    setStatusFilter("ALL");
    setSiteFilter("ALL");
    setDepartmentFilter("ALL");
    setEmployeeFilter("ALL");
    setSourceFilter("ALL");
    setUseDateFrom("");
    setUseDateTo("");
    setValueFilter("ALL");
    setAssetPage(1);
    setQuery("");
  };

  const selectedCategoryNodes = useMemo(
    () => findCategoryPath(categoryTree, categoryPath),
    [categoryPath, categoryTree],
  );
  const selectedCategoryPathIds = useMemo(
    () => new Set(selectedCategoryNodes.map((node) => node.id)),
    [selectedCategoryNodes],
  );

  const selectedCategoryNode = selectedCategoryNodes.at(-1) ?? null;

  const assetDraftChanged = useMemo(() => {
    if (!selectedAsset || !assetDraft) return false;
    return JSON.stringify(assetDraft) !== JSON.stringify(buildAssetPayload(selectedAsset));
  }, [assetDraft, selectedAsset]);

  const siteOptions = useMemo(
    () =>
      Array.from(new Set(assets.map((asset) => asset.siteId).filter(Boolean) as number[])).sort(
        (a, b) => siteName(a).localeCompare(siteName(b), "vi"),
      ),
    [assets, workSites],
  );

  const departmentOptions = useMemo(() => {
    const ids = new Set<number>();
    assets.forEach((asset) => {
      if (siteFilter !== "ALL" && asset.siteId !== Number(siteFilter)) return;
      if (asset.departmentId) ids.add(asset.departmentId);
    });
    return Array.from(ids).sort((a, b) => departmentName(a).localeCompare(departmentName(b), "vi"));
  }, [assets, departments, siteFilter]);

  const employeeOptions = useMemo(() => {
    const ids = new Set<number>();
    assets.forEach((asset) => {
      if (siteFilter !== "ALL" && asset.siteId !== Number(siteFilter)) return;
      if (departmentFilter !== "ALL" && asset.departmentId !== Number(departmentFilter)) return;
      if (asset.assignedEmployeeId) ids.add(asset.assignedEmployeeId);
    });
    return Array.from(ids).sort((a, b) => employeeName(a).localeCompare(employeeName(b), "vi"));
  }, [assets, departmentFilter, employees, siteFilter]);

  const sourceOptions = useMemo(
    () =>
      Array.from(new Set(assets.map((asset) => asset.source?.trim()).filter(Boolean) as string[]))
        .sort((a, b) => a.localeCompare(b, "vi")),
    [assets],
  );

  useEffect(() => {
    if (departmentFilter === "ALL") return;
    if (!departmentOptions.includes(Number(departmentFilter))) {
      setDepartmentFilter("ALL");
      setEmployeeFilter("ALL");
    }
  }, [departmentFilter, departmentOptions]);

  useEffect(() => {
    if (employeeFilter === "ALL") return;
    if (!employeeOptions.includes(Number(employeeFilter))) {
      setEmployeeFilter("ALL");
    }
  }, [employeeFilter, employeeOptions]);

  useEffect(() => {
    if (useDateFrom && useDateTo && useDateFrom > useDateTo) {
      setUseDateTo("");
    }
  }, [useDateFrom, useDateTo]);

  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const valueRange = ASSET_VALUE_FILTERS.find((item) => item.value === valueFilter);
    const selectedCategoryIds = selectedCategoryNode
      ? (categoryDescendantIds.get(selectedCategoryNode.id) ??
        collectCategoryIds(selectedCategoryNode))
      : null;
    return assets.filter((asset) => {
      const matchesStatus = statusFilter === "ALL" || asset.status === statusFilter;
      const assetCategoryId = asset.assetCategory?.id;
      const matchesCategory =
        !selectedCategoryNode ||
        (assetCategoryId && selectedCategoryIds?.has(assetCategoryId)) ||
        assetMatchesCategoryNode(asset, selectedCategoryNode, selectedCategoryIds);
      const matchesSite = siteFilter === "ALL" || asset.siteId === Number(siteFilter);
      const matchesDepartment =
        departmentFilter === "ALL" || asset.departmentId === Number(departmentFilter);
      const matchesEmployee =
        employeeFilter === "ALL" || asset.assignedEmployeeId === Number(employeeFilter);
      const matchesSource = sourceFilter === "ALL" || asset.source?.trim() === sourceFilter;
      const assetUseDate = dateKey(asset.useDate);
      const matchesUseDateFrom = !useDateFrom || (assetUseDate && assetUseDate >= useDateFrom);
      const matchesUseDateTo = !useDateTo || (assetUseDate && assetUseDate <= useDateTo);
      const cost = Number(asset.purchaseCost || 0);
      const matchesValue =
        valueFilter === "ALL" ||
        Boolean(
          valueRange &&
            (valueRange.min === undefined || cost >= valueRange.min) &&
            (valueRange.max === undefined || cost < valueRange.max),
        );
      const searchable = [
        asset.assetCode,
        asset.name,
        asset.category,
        asset.assetCategory?.name,
        asset.assetCategory?.code,
        asset.serialNumber,
        asset.vendor?.name,
        employeeName(asset.assignedEmployeeId),
        departmentName(asset.departmentId),
        siteName(asset.siteId),
        projectName(asset.projectId),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalized || searchable.includes(normalized);
      return (
        matchesStatus &&
        matchesCategory &&
        matchesSite &&
        matchesDepartment &&
        matchesEmployee &&
        matchesSource &&
        matchesUseDateFrom &&
        matchesUseDateTo &&
        matchesValue &&
        matchesQuery
      );
    });
  }, [
    assets,
    categoryDescendantIds,
    departments,
    employees,
    projects,
    query,
    selectedCategoryNode,
    departmentFilter,
    employeeFilter,
    siteFilter,
    sourceFilter,
    statusFilter,
    useDateFrom,
    useDateTo,
    valueFilter,
    workSites,
  ]);

  useEffect(() => {
    setAssetPage(1);
  }, [
    categoryPath,
    departmentFilter,
    employeeFilter,
    query,
    siteFilter,
    sourceFilter,
    statusFilter,
    useDateFrom,
    useDateTo,
    valueFilter,
  ]);

  const assetPageCount = Math.max(1, Math.ceil(filteredAssets.length / assetPageSize));
  const safeAssetPage = Math.min(assetPage, assetPageCount);
  const pagedAssets = useMemo(
    () =>
      filteredAssets.slice(
        (safeAssetPage - 1) * assetPageSize,
        safeAssetPage * assetPageSize,
      ),
    [assetPageSize, filteredAssets, safeAssetPage],
  );

  useEffect(() => {
    if (assetPage > assetPageCount) setAssetPage(assetPageCount);
  }, [assetPage, assetPageCount]);

  const totalValue = useMemo(
    () => assets.reduce((sum, item) => sum + Number(item.purchaseCost || 0), 0),
    [assets],
  );

  const filteredValue = useMemo(
    () => filteredAssets.reduce((sum, item) => sum + Number(item.purchaseCost || 0), 0),
    [filteredAssets],
  );

  const importPreviewRows = useMemo(() => {
    const rows = importResult?.rows ?? importRows.slice(0, 30);
    if (!importResult || importPreviewFilter === "ALL") return rows;
    return rows.filter((row) => "errors" in row && row.status === importPreviewFilter);
  }, [importPreviewFilter, importResult, importRows]);

  const canCommitImport = Boolean(
    importResult &&
      importRows.length > 0 &&
      importResult.validRows > 0 &&
      (importMode === "VALID_ROWS_ONLY" || importResult.errorRows === 0),
  );

  const reloadAssetList = async () => {
    setListRefreshing(true);
    try {
      await ensureAssets(true);
    } finally {
      setListRefreshing(false);
    }
  };

  const toggleAssetCategory = (id: number) => {
    setExpandedAssetCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAssetDetail = (item: AssetItem) => {
    setSelectedAsset(item);
    setAssetDraft(buildAssetPayload(item));
    void ensureAssetDetailLookups();
  };

  const closeAssetDetail = () => {
    if (assetSaving) return;
    setSelectedAsset(null);
    setAssetDraft(null);
  };

  const updateAssetDraft = (field: keyof AssetPayload, value: AssetPayload[keyof AssetPayload]) => {
    setAssetDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSaveAsset = async () => {
    if (!selectedAsset || !assetDraft) return;
    setAssetSaving(true);
    try {
      await updateAsset(selectedAsset.id, assetDraft);
      toast.success("Đã cập nhật tài sản.");
      await reloadAssetList();
      setSelectedAsset(null);
      setAssetDraft(null);
    } catch {
      toast.error("Không cập nhật được tài sản.");
    } finally {
      setAssetSaving(false);
    }
  };

  const handleDeleteAsset = async (item: AssetItem) => {
    const confirmed = window.confirm(`Xóa tài sản ${item.assetCode} - ${item.name}?`);
    if (!confirmed) return;
    try {
      await deleteAsset(item.id);
      toast.success("Đã xóa tài sản.");
      await reloadAssetList();
    } catch {
      toast.error("Không xóa được tài sản.");
    }
  };

  const closeImport = () => {
    if (importBusy) return;
    setImportOpen(false);
    setImportCancelConfirm(false);
    setImportFileName("");
    setImportRows([]);
    setImportResult(null);
    setImportMode("VALID_ROWS_ONLY");
    setImportPreviewFilter("ALL");
    setImportTooltip(null);
  };

  const requestCloseImport = () => {
    if (importBusy) return;
    if (importFileName || importRows.length > 0 || importResult) {
      setImportCancelConfirm(true);
      return;
    }
    closeImport();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportBusy(true);
    setImportResult(null);
    setImportPreviewFilter("ALL");
    try {
      const rows = await parseAssetImportFile(file);
      setImportRows(rows);
      setImportFileName(file.name);
      toast.success(`Đã đọc ${rows.length} dòng từ Excel.`);
    } catch (error) {
      setImportRows([]);
      setImportFileName("");
      toast.error(error instanceof Error ? error.message : "Không đọc được file Excel.");
    } finally {
      setImportBusy(false);
    }
  };

  const handleValidateImport = async () => {
    if (importRows.length === 0) {
      toast.error("Chưa có dữ liệu import.");
      return;
    }
    setImportBusy(true);
    try {
      const result = await validateAssetImport(importRows);
      setImportResult(result);
      setImportPreviewFilter("ALL");
      if (result.errorRows > 0) {
        toast.error(`Có ${result.errorRows} dòng lỗi cần kiểm tra.`);
      } else {
        toast.success("Dữ liệu import hợp lệ.");
      }
    } catch {
      toast.error("Backend import đang chờ bạn implement phần validate.");
    } finally {
      setImportBusy(false);
    }
  };

  const handleCommitImport = async () => {
    if (importRows.length === 0) {
      toast.error("Chưa có dữ liệu import.");
      return;
    }
    setImportBusy(true);
    try {
      const result = await commitAssetImport({ importMode, rows: importRows });
      setImportResult({
        uploadStatus: result.uploadStatus,
        totalRows: importRows.length,
        validRows: result.importedRows,
        errorRows: result.errorRows,
        warningRows: 0,
        rows: result.rows,
      });
      setImportPreviewFilter("ALL");
      toast.success(`Đã import ${result.importedRows} tài sản.`);
      await reloadAssetList();
    } catch {
      toast.error("Backend import đang chờ bạn implement phần lưu dữ liệu.");
    } finally {
      setImportBusy(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const loadingToast = toast.loading("Đang tạo file mẫu Excel...");
    try {
      await downloadAssetImportTemplate();
      toast.success("Đã tải file mẫu Excel.", { id: loadingToast });
    } catch {
      toast.error("Không tạo được file mẫu Excel.", { id: loadingToast });
    }
  };

  const showImportTooltip = (event: MouseEvent<HTMLElement>, messages: string[]) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setImportTooltip({
      text: messages.map((message) => `- ${message}`).join("\n"),
      x: rect.left,
      y: rect.top,
    });
  };

  const headerExtraActions = (
    <>
      <button type="button" className="asset-template-button" onClick={handleDownloadTemplate}>
        <FiDownload /> Tải mẫu Excel
      </button>
      <button type="button" className="asset-import-button" onClick={() => setImportOpen(true)}>
        <FiUpload /> Tải lên file Excel
      </button>
    </>
  );

  return (
    <section className="asset-page panel">
      <PanelHeader
        title="Danh sách tài sản"
        action={canManage}
        onAdd={() => openModal({ type: "asset", mode: "create" })}
        extraActions={headerExtraActions}
      />

      <div className="asset-list-layout">
        <aside className="asset-category-sidebar">
          <div className="asset-category-sidebar-head">
            <div>
              <span>Danh mục</span>
              <strong>{selectedCategoryNode?.name || "Tất cả danh mục"}</strong>
            </div>
            <button type="button" className="asset-category-clear" onClick={resetAssetFilters}>
              Tất cả
            </button>
          </div>

          <div className="asset-category-filter-list">
            <button
              type="button"
              className="asset-category-filter-item all"
              data-selected={!selectedCategoryNode ? "true" : undefined}
              onClick={resetAssetFilters}
            >
              <span className="asset-category-filter-spacer" />
              <span className="asset-category-filter-copy">
                <strong>Tất cả danh mục</strong>
                <small>Toàn bộ tài sản</small>
              </span>
              <span className="asset-category-filter-count">{assets.length}</span>
            </button>

            {categoryTree.map((node) => (
              <AssetCategoryFilterNode
                key={node.id}
                node={node}
                selectedId={selectedCategoryNode?.id}
                selectedPathIds={selectedCategoryPathIds}
                expandedIds={expandedAssetCategoryIds}
                assetCounts={categoryAssetCounts}
                onSelect={(category) =>
                  setCategoryPath(findCategoryIdPath(categoryTree, category.id))
                }
                onToggle={toggleAssetCategory}
              />
            ))}
          </div>
        </aside>

        <div className="asset-results-column">
          <div className="asset-toolbar">
            <label className="asset-search">
              <FiSearch />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo mã, tên, serial, nhà cung cấp..."
              />
            </label>
            {/* <select
              value={siteFilter}
              onChange={(event) => {
                setSiteFilter(event.target.value);
                setDepartmentFilter("ALL");
                setEmployeeFilter("ALL");
              }}
            >
              <option value="ALL">Tất cả chi nhánh</option>
              {siteOptions.map((siteId) => (
                <option key={siteId} value={siteId}>
                  {siteName(siteId)}
                </option>
              ))}
            </select> */}
            {/* <select
              value={departmentFilter}
              onChange={(event) => {
                setDepartmentFilter(event.target.value);
                setEmployeeFilter("ALL");
              }}
              disabled={departmentOptions.length === 0}
            >
              <option value="ALL">Tất cả phòng ban</option>
              {departmentOptions.map((departmentId) => (
                <option key={departmentId} value={departmentId}>
                  {departmentName(departmentId)}
                </option>
              ))}
            </select> */}
            {/* <select
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
              disabled={employeeOptions.length === 0}
            >
              <option value="ALL">Tất cả nhân sự</option>
              {employeeOptions.map((employeeId) => (
                <option key={employeeId} value={employeeId}>
                  {employeeName(employeeId)}
                </option>
              ))}
            </select> */}
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AssetStatusFilter)}
            >
              {(["ALL", "IN_STOCK", "ASSIGNED", "MAINTENANCE", "DISPOSED"] as const).map(
                (status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ),
              )}
            </select>
            <select
              value={valueFilter}
              onChange={(event) => setValueFilter(event.target.value as AssetValueFilter)}
            >
              {ASSET_VALUE_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {/* <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              disabled={sourceOptions.length === 0}
            >
              <option value="ALL">Tất cả nguồn hình thành</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select> */}
            <label className="asset-date-filter">
              <span>Từ ngày sử dụng</span>
              <input
                type="date"
                value={useDateFrom}
                onChange={(event) => setUseDateFrom(event.target.value)}
              />
            </label>
            <label className="asset-date-filter">
              <span>Đến ngày sử dụng</span>
              <input
                type="date"
                value={useDateTo}
                min={useDateFrom || undefined}
                onChange={(event) => setUseDateTo(event.target.value)}
              />
            </label>
          </div>

          <div className={`asset-list-panel ${listRefreshing ? "is-refreshing" : ""}`}>
            <div className="asset-list-head">
              <div>
                <strong>{filteredAssets.length} tài sản</strong>
                <span>
                  Tổng giá trị của tài sản đang hiển thị:{" "}
                  <span style={{ color: "#007bff", fontWeight: "600" }}>
                    {money.format(filteredValue)}
                  </span>
                  {filteredAssets.length !== assets.length ? (
                    <>
                      {" "}
                      /{" "}
                      <span style={{ color: "#007bff", fontWeight: "600" }}>
                        {money.format(totalValue)}
                      </span>{" "}
                      toàn bộ
                    </>
                  ) : (
                    ""
                  )}
                </span>
              </div>
            </div>

            {filteredAssets.length === 0 ? (
              <div className="empty-state">Không có tài sản phù hợp bộ lọc.</div>
            ) : (
              <div className="asset-table">
                <table>
                  <thead>
                    <tr>
                      <th>Tài sản</th>
                      <th>Danh mục</th>
                      <th>Giá trị</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedAssets.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="asset-name-cell">
                            <strong>{highlightSearchText(item.name, query)}</strong>
                            <span>{highlightSearchText(item.assetCode, query)}</span>
                          </div>
                        </td>
                        <td>
                          <div className="asset-muted-stack">
                            <strong>
                              {highlightSearchText(
                                item.assetCategory?.name || item.category || "Chưa phân loại",
                                query,
                              )}
                            </strong>
                            <span>
                              {highlightSearchText(
                                item.assetCategory?.code || "Chưa có mã danh mục",
                                query,
                              )}
                            </span>
                          </div>
                        </td>
                        <td>{money.format(Number(item.purchaseCost || 0))}</td>
                        <td>
                          <StatusBadge value={item.status} />
                        </td>
                        <td>
                          <div className="asset-row-icon-actions">
                            <button
                              type="button"
                              className="asset-icon-action"
                              title="Xem và chỉnh sửa tài sản"
                              onClick={() => openAssetDetail(item)}
                            >
                              <FiEye />
                            </button>
                            <button
                              type="button"
                              className="asset-icon-action"
                              title="Xem mã QR tài sản"
                              onClick={() => setQrAsset(item)}
                            >
                              <FiGrid />
                            </button>
                            {canManage && (
                              <button
                                type="button"
                                className="asset-icon-action danger"
                                title="Xóa tài sản"
                                onClick={() => void handleDeleteAsset(item)}
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <AssetListPagination
              page={safeAssetPage}
              pageSize={assetPageSize}
              total={filteredAssets.length}
              onPageChange={setAssetPage}
              onPageSizeChange={(nextPageSize) => {
                setAssetPageSize(nextPageSize);
                setAssetPage(1);
              }}
            />
            {listRefreshing && (
              <div className="asset-list-refreshing">Đang cập nhật danh sách...</div>
            )}
          </div>
        </div>
      </div>

      {selectedAsset && assetDraft && (
        <div className="modal-backdrop">
          <div className="crud-modal asset-detail-modal">
            <div className="modal-head">
              <div className="modal-title-group">
                <span className="modal-title-icon edit">
                  <FiEye />
                </span>
                <div>
                  <h2>Chi tiết tài sản</h2>
                  <p>
                    {selectedAsset.assetCode} · {selectedAsset.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={closeAssetDetail}
                disabled={assetSaving}
              >
                <FiX />
              </button>
            </div>

            <div className="asset-detail-body">
              <div className="asset-detail-hero">
                <div>
                  <span>Mã tài sản</span>
                  <strong>{selectedAsset.assetCode}</strong>
                </div>
                <div>
                  <span>Danh mục</span>
                  <strong>
                    {selectedAsset.assetCategory?.name ||
                      selectedAsset.category ||
                      "Chưa phân loại"}
                  </strong>
                </div>
                <div>
                  <span>Phân loại</span>
                  <strong>{classLabel(selectedAsset.assetClass)}</strong>
                </div>
                <div>
                  <span>Trạng thái</span>
                  <StatusBadge value={selectedAsset.status} />
                </div>
              </div>

              <div className="asset-detail-grid">
                <section className="asset-detail-section">
                  <h3>Định danh và phân loại</h3>
                  <div className="asset-detail-fields">
                    <label>
                      <span>Tên tài sản</span>
                      <input
                        value={assetDraft.name}
                        onChange={(event) => updateAssetDraft("name", event.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Mã tài sản</span>
                      <input value={assetDraft.assetCode} disabled />
                    </label>
                    <label>
                      <span>Danh mục</span>
                      <input value={assetDraft.category} disabled />
                    </label>
                    <label>
                      <span>Mã danh mục</span>
                      <input value={selectedAsset.assetCategory?.code || "—"} disabled />
                    </label>
                    <label>
                      <span>Loại tài sản</span>
                      <input value={classLabel(assetDraft.assetClass)} disabled />
                    </label>
                    <label>
                      <span>Loại tài sản cố định</span>
                      <input value={classLabel(assetDraft.fixedAssetType)} disabled />
                    </label>
                    <label>
                      <span>Loại công cụ dụng cụ</span>
                      <input value={classLabel(assetDraft.toolUsageType)} disabled />
                    </label>
                    <label>
                      <span>Mẫu tài sản</span>
                      <input
                        value={
                          selectedAsset.catalogItem
                            ? `${selectedAsset.catalogItem.itemCode} - ${selectedAsset.catalogItem.name}`
                            : "Chưa gắn mẫu tài sản"
                        }
                        disabled
                      />
                    </label>
                    <label>
                      <span>Tài sản cha</span>
                      <input
                        value={
                          selectedAsset.parentAsset
                            ? `${selectedAsset.parentAsset.assetCode} - ${selectedAsset.parentAsset.name}`
                            : "Không có"
                        }
                        disabled
                      />
                    </label>
                    <label>
                      <span>Serial/MAC</span>
                      <input
                        value={assetDraft.serialNumber || ""}
                        onChange={(event) => updateAssetDraft("serialNumber", event.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Trạng thái</span>
                      <select
                        value={assetDraft.status || "IN_STOCK"}
                        onChange={(event) => updateAssetDraft("status", event.target.value)}
                        disabled={!canManage || assetSaving}
                      >
                        <option value="IN_STOCK">Trong kho</option>
                        <option value="ASSIGNED">Đã cấp phát</option>
                        <option value="MAINTENANCE">Bảo trì</option>
                        <option value="DISPOSED">Đã thanh lý</option>
                        <option value="LOST">Mất</option>
                      </select>
                    </label>
                    <label>
                      <span>Nguồn hình thành</span>
                      <input
                        value={assetDraft.source || ""}
                        onChange={(event) => updateAssetDraft("source", event.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                  </div>
                </section>
                <section className="asset-detail-section">
                  <h3>Sử dụng, đơn vị và vị trí</h3>
                  <div className="asset-detail-fields">
                    
                    <label>
                      <span>Site hiện tại</span>
                      <select
                        value={assetDraft.siteId ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("siteId", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      >
                        <option value="">Chưa gán chi nhánh</option>
                        {workSites.map((site) => (
                          <option key={site.id} value={site.id}>
                            {site.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Phòng ban quản lý</span>
                      <select
                        value={assetDraft.departmentId ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("departmentId", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      >
                        <option value="">Chưa gán phòng ban</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Nhân sự đang giữ</span>
                      <select
                        value={assetDraft.assignedEmployeeId ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("assignedEmployeeId", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      >
                        <option value="">Chưa gán người giữ</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employeeLabel(employee)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Dự án</span>
                      <select
                        value={assetDraft.projectId ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("projectId", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      >
                        <option value="">Chưa gán dự án</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {projectLabel(project)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div>
                      <span>Ngày đưa vào sử dụng</span>
                      <strong>{selectedAsset.useDate || "—"}</strong>
                    </div>
                    <div>
                      <span>Nguồn hình thành</span>
                      <strong>{assetDraft.source || "—"}</strong>
                    </div>
                  </div>
                </section>

                <section className="asset-detail-section">
                  <h3>Tài chính và khấu hao</h3>
                  <div className="asset-detail-fields">
                    <label>
                      <span>Nguyên giá</span>
                      <input
                        type="number"
                        value={assetDraft.originalCost ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("originalCost", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Giá mua/ghi nhận</span>
                      <input
                        type="number"
                        value={assetDraft.purchaseCost ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("purchaseCost", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Hao mòn lũy kế</span>
                      <input
                        type="number"
                        value={assetDraft.accumulatedDepreciation ?? ""}
                        onChange={(event) =>
                          updateAssetDraft(
                            "accumulatedDepreciation",
                            optionalNumber(event.target.value),
                          )
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Giá trị sổ sách</span>
                      <input
                        type="number"
                        value={assetDraft.bookValue ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("bookValue", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Giá trị còn lại</span>
                      <input
                        type="number"
                        value={assetDraft.residualValue ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("residualValue", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Ngày mua</span>
                      <input
                        type="date"
                        value={assetDraft.purchaseDate || ""}
                        onChange={(event) => updateAssetDraft("purchaseDate", event.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Ngày bắt đầu khấu hao</span>
                      <input
                        type="date"
                        value={assetDraft.depreciationStartDate || ""}
                        onChange={(event) =>
                          updateAssetDraft("depreciationStartDate", event.target.value)
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Bảo hành đến</span>
                      <input
                        type="date"
                        value={assetDraft.warrantyUntil || ""}
                        onChange={(event) => updateAssetDraft("warrantyUntil", event.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Phương pháp khấu hao</span>
                      <input
                        value={assetDraft.depreciationMethod || ""}
                        onChange={(event) =>
                          updateAssetDraft("depreciationMethod", event.target.value)
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Số tháng sử dụng</span>
                      <input
                        type="number"
                        value={assetDraft.usefulLifeMonths ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("usefulLifeMonths", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Số năm sử dụng</span>
                      <input
                        type="number"
                        value={assetDraft.usefulLifeYears ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("usefulLifeYears", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Tỷ lệ khấu hao</span>
                      <input
                        type="number"
                        value={assetDraft.depreciationRate ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("depreciationRate", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                  </div>
                </section>

                <section className="asset-detail-section">
                  <h3>Thông số kỹ thuật</h3>
                  <div className="asset-detail-fields">
                    <label>
                      <span>Xuất xứ/mã quốc gia</span>
                      <input
                        value={assetDraft.countryCode || ""}
                        onChange={(event) => updateAssetDraft("countryCode", event.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Năm sản xuất</span>
                      <input
                        type="number"
                        value={assetDraft.manufactureYear ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("manufactureYear", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Năm lắp đặt/cài đặt</span>
                      <input
                        type="number"
                        value={assetDraft.installationYear ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("installationYear", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Công suất thiết kế</span>
                      <input
                        type="number"
                        value={assetDraft.capacity ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("capacity", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Công suất thực tế</span>
                      <input
                        type="number"
                        value={assetDraft.realCapacity ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("realCapacity", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Đơn vị công suất</span>
                      <input
                        value={assetDraft.capacityUnit || ""}
                        onChange={(event) => updateAssetDraft("capacityUnit", event.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                  </div>
                  <label className="asset-detail-wide-field">
                    <span>Mô tả kỹ thuật</span>
                    <textarea
                      value={assetDraft.technicalDescription || ""}
                      onChange={(event) =>
                        updateAssetDraft("technicalDescription", event.target.value)
                      }
                      disabled={!canManage || assetSaving}
                      rows={4}
                    />
                  </label>
                </section>

                <section className="asset-detail-section">
                  <h3>Thanh lý và hệ thống</h3>
                  <div className="asset-detail-readonly-grid">
                    <div>
                      <span>Ngày thanh lý</span>
                      <strong>{selectedAsset.disposalDate || "—"}</strong>
                    </div>
                    <div>
                      <span>Giá thanh lý</span>
                      <strong>
                        {selectedAsset.disposalPrice
                          ? money.format(Number(selectedAsset.disposalPrice))
                          : "—"}
                      </strong>
                    </div>
                    <div>
                      <span>Lý do thanh lý</span>
                      <strong>{selectedAsset.disposalReason || "—"}</strong>
                    </div>
                    <div>
                      <span>Nhà cung cấp</span>
                      <strong>{selectedAsset.vendor?.name || "Chưa có nhà cung cấp"}</strong>
                    </div>
                    <div>
                      <span>Ngày tạo</span>
                      <strong>{dateTimeLabel(selectedAsset.createdAt)}</strong>
                    </div>
                    <div>
                      <span>Cập nhật lần cuối</span>
                      <strong>{dateTimeLabel(selectedAsset.updatedAt)}</strong>
                    </div>
                  </div>
                </section>

                <section className="asset-detail-section asset-detail-section-wide">
                  <h3>Ghi chú</h3>
                  <textarea
                    value={assetDraft.notes || ""}
                    onChange={(event) => updateAssetDraft("notes", event.target.value)}
                    disabled={!canManage || assetSaving}
                    rows={4}
                  />
                </section>
              </div>
            </div>

            <div className="modal-actions asset-detail-actions">
              <button
                type="button"
                className="secondary"
                onClick={closeAssetDetail}
                disabled={assetSaving}
              >
                Đóng
              </button>
              {canManage && (
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => void handleSaveAsset()}
                  disabled={assetSaving || !assetDraftChanged}
                >
                  Lưu thay đổi
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {qrAsset && (
        <div className="modal-backdrop">
          <div className="crud-modal asset-qr-modal">
            <div className="modal-head">
              <div className="modal-title-group">
                <span className="modal-title-icon create">
                  <FiGrid />
                </span>
                <div>
                  <h2>Mã QR tài sản</h2>
                  <p>{qrAsset.assetCode}</p>
                </div>
              </div>
              <button type="button" className="icon-button" onClick={() => setQrAsset(null)}>
                <FiX />
              </button>
            </div>
            <div className="asset-qr-placeholder">
              <FiGrid />
              <strong>{qrAsset.name}</strong>
              <span>Tính năng sinh và in QR sẽ được hiện thực ở bước sau.</span>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setQrAsset(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {importOpen && (
        <div className="modal-backdrop">
          <div className="crud-modal asset-import-modal">
            <div className="modal-head">
              <div className="modal-title-group">
                <span className="modal-title-icon create">
                  <FiFileText />
                </span>
                <div>
                  <h2>Tải danh sách tài sản</h2>
                </div>
              </div>
              <button type="button" className="icon-button" onClick={requestCloseImport}>
                <FiX />
              </button>
            </div>

            <div className="asset-import-body">
              <div className="asset-import-file-row">
                <label className="asset-import-file-button">
                  <FiUpload /> Chọn file Excel
                  <input type="file" accept=".xlsx,.xls" onChange={handleImportFile} />
                </label>
                <div className="asset-import-file-meta">
                  <strong>{importFileName || "Chưa chọn file Excel"}</strong>
                  <small>Hỗ trợ sheet HoSoTaiSan_import, định dạng .xlsx hoặc .xls</small>
                </div>
              </div>

              <div className="asset-import-summary">
                <div>
                  <span>Dòng đã đọc</span>
                  <strong>{importRows.length}</strong>
                </div>
                <div>
                  <span>Hợp lệ</span>
                  <strong>{importResult?.validRows ?? "—"}</strong>
                </div>
                <div>
                  <span>Lỗi</span>
                  <strong>{importResult?.errorRows ?? "—"}</strong>
                </div>
                <div>
                  <span>Cảnh báo</span>
                  <strong>{importResult?.warningRows ?? "—"}</strong>
                </div>
              </div>

              <div className="asset-import-controls">
                <div className="asset-import-options">
                  <label>
                    <span>Chế độ nhập dữ liệu</span>
                    <select
                      value={importMode}
                      onChange={(event) => setImportMode(event.target.value as ImportMode)}
                    >
                      <option value="VALID_ROWS_ONLY">Chỉ nhập những dòng hợp lệ</option>
                      <option value="ALL_OR_NOTHING">Tất cả hoặc không nhập</option>
                    </select>
                  </label>
                </div>

                <div className="asset-import-preview-toolbar">
                  <span>Trạng thái dòng</span>
                  <div>
                    <button
                      type="button"
                      data-active={importPreviewFilter === "ALL" ? "true" : undefined}
                      onClick={() => setImportPreviewFilter("ALL")}
                    >
                      Tất cả <strong>{importResult?.totalRows ?? importRows.length}</strong>
                    </button>
                    <button
                      type="button"
                      data-active={importPreviewFilter === "VALID" ? "true" : undefined}
                      disabled={!importResult}
                      onClick={() => setImportPreviewFilter("VALID")}
                    >
                      Hợp lệ <strong>{importResult?.validRows ?? 0}</strong>
                    </button>
                    <button
                      type="button"
                      data-active={importPreviewFilter === "INVALID" ? "true" : undefined}
                      disabled={!importResult}
                      onClick={() => setImportPreviewFilter("INVALID")}
                    >
                      Lỗi <strong>{importResult?.errorRows ?? 0}</strong>
                    </button>
                    <button
                      type="button"
                      data-active={importPreviewFilter === "WARNING" ? "true" : undefined}
                      disabled={!importResult}
                      onClick={() => setImportPreviewFilter("WARNING")}
                    >
                      Cảnh báo <strong>{importResult?.warningRows ?? 0}</strong>
                    </button>
                  </div>
                </div>
              </div>

              <div className="asset-import-preview">
                {importRows.length === 0 ? (
                  <div className="empty-state">
                    Chọn file Excel để xem dữ liệu trước khi import.
                  </div>
                ) : importPreviewRows.length === 0 ? (
                  <div className="empty-state">Không có dòng phù hợp bộ lọc.</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Dòng</th>
                        <th>Tài sản</th>
                        <th>Danh mục</th>
                        <th>Phân loại</th>
                        <th>Loại con</th>
                        <th>Phòng ban</th>
                        <th>Chi nhánh</th>
                        <th>Serial/MAC</th>
                        <th>Ngày dùng</th>
                        <th>Nguyên giá</th>
                        <th>Giá trị CL</th>
                        <th>Trạng thái</th>
                        <th>Ghi chú kiểm tra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreviewRows.map((row) => {
                        const isResultRow = "errors" in row;
                        const source: AssetImportRowPayload | undefined = isResultRow
                          ? importRows.find((item) => item.rowNumber === row.rowNumber)
                          : row;
                        const status = isResultRow ? row.status : undefined;
                        const rowMessages = isResultRow
                          ? [...row.errors, ...row.warnings].map((item) => item.message)
                          : [];
                        return (
                          <tr key={row.rowNumber} data-status={status}>
                            <td>{row.rowNumber}</td>
                            <td>
                              <div className="asset-name-cell">
                                <strong>{isResultRow ? row.assetName : source?.name || "—"}</strong>
                                {source?.assetCode && <span>{source.assetCode}</span>}
                              </div>
                            </td>
                            <td>{isResultRow ? row.categoryCode : source?.categoryCode}</td>
                            <td>{source?.assetClass || "—"}</td>
                            <td>{source?.classType || "—"}</td>
                            <td>{source?.departmentName || "—"}</td>
                            <td>{source?.siteName || "—"}</td>
                            <td>{source?.serialNumber || "—"}</td>
                            <td>{source?.useDate || "—"}</td>
                            <td>
                              {source?.originalCost ? money.format(source.originalCost) : "—"}
                            </td>
                            <td>{source?.bookValue ? money.format(source.bookValue) : "—"}</td>
                            <td>
                              {status ? (
                                <span className="asset-import-row-status">
                                  {importStatusLabel(status)}
                                </span>
                              ) : (
                                source?.status || "—"
                              )}
                            </td>
                            <td className="asset-import-message-cell">
                              {rowMessages.length > 0 ? (
                                <span
                                  className="asset-import-message-summary"
                                  onMouseEnter={(event) => showImportTooltip(event, rowMessages)}
                                  onMouseLeave={() => setImportTooltip(null)}
                                >
                                  - {rowMessages[0]}
                                  {rowMessages.length > 1 ? ` (+${rowMessages.length - 1})` : ""}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {importTooltip && (
              <div
                className="asset-import-floating-tooltip"
                style={{ left: importTooltip.x, top: importTooltip.y }}
              >
                {importTooltip.text}
              </div>
            )}

            <div className="modal-actions asset-import-actions">
              <button
                type="button"
                className="secondary"
                onClick={requestCloseImport}
                disabled={importBusy}
              >
                Hủy
              </button>
              {importResult && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => downloadImportCsv(importResult)}
                  disabled={importBusy}
                >
                  <FiDownload /> Tải kết quả
                </button>
              )}
              <button
                type="button"
                className="secondary"
                onClick={handleValidateImport}
                disabled={importBusy || importRows.length === 0}
              >
                Kiểm tra dữ liệu
              </button>
              <button
                type="button"
                className="primary-action"
                onClick={handleCommitImport}
                disabled={importBusy || !canCommitImport}
              >
                Import
              </button>
            </div>

            {importCancelConfirm && (
              <div className="asset-import-confirm">
                <div className="asset-import-confirm-card">
                  <div className="asset-import-confirm-icon">
                    <FiX />
                  </div>
                  <div className="asset-import-confirm-content">
                    <strong>Hủy phiên nhập tài sản?</strong>
                    <p>
                      File đã chọn, dữ liệu preview và kết quả kiểm tra hiện tại sẽ bị xóa khỏi màn
                      hình.
                    </p>
                  </div>
                  <div className="asset-import-confirm-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setImportCancelConfirm(false)}
                    >
                      Tiếp tục nhập
                    </button>
                    <button type="button" className="danger-action" onClick={closeImport}>
                      Hủy phiên nhập
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
