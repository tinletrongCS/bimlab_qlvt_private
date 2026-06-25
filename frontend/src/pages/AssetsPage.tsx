import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  FiArchive,
  FiBox,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiSearch,
  FiTool,
  FiUpload,
  FiUserCheck,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { AssetActions } from "../components/AssetActions";
import { PanelHeader } from "../components/PanelHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useActions } from "../contexts/ActionsContext";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import { employeeLabel, money, projectLabel } from "../lib/format";
import { commitAssetImport, validateAssetImport } from "../services/api";
import type {
  AssetImportCommitPayload,
  AssetImportRowPayload,
  AssetImportValidationResponse,
} from "../services/types";

type AssetStatusFilter = "ALL" | "IN_STOCK" | "ASSIGNED" | "MAINTENANCE" | "DISPOSED";
type ImportMode = AssetImportCommitPayload["importMode"];
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

function AssetMetric({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`asset-metric ${accent ? "accent" : ""}`}>
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
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
  const escape = (value: string | number | null | undefined) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [
    header.map(escape).join(","),
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
        .map(escape)
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

export function AssetsPage() {
  const { hasPermission } = useAuth();
  const { assets, employees, departments, workSites, projects, ensureAssets, refresh } =
    useAppData();
  const { openModal, deleteResource, disposeAssetAction, revokeAsset } = useActions();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssetStatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importRows, setImportRows] = useState<AssetImportRowPayload[]>([]);
  const [importResult, setImportResult] = useState<AssetImportValidationResponse | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("VALID_ROWS_ONLY");

  useEffect(() => {
    void ensureAssets();
  }, [ensureAssets]);

  const canManage = hasPermission("asset_manage");
  const employeeName = (id?: number) =>
    id ? employeeLabel(employees.find((employee) => employee.id === id)) : "Trong kho";
  const departmentName = (id?: number) =>
    id ? departments.find((department) => department.id === id)?.name || `Phòng ban #${id}` : "—";
  const siteName = (id?: number) =>
    id ? workSites.find((site) => site.id === id)?.name || `Site #${id}` : "—";
  const projectName = (id?: number) =>
    id ? projectLabel(projects.find((project) => project.id === id)) : "—";

  const categories = useMemo(
    () =>
      Array.from(new Set(assets.map((asset) => asset.category).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "vi"),
      ),
    [assets],
  );

  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesStatus = statusFilter === "ALL" || asset.status === statusFilter;
      const matchesCategory = categoryFilter === "ALL" || asset.category === categoryFilter;
      const searchable = [
        asset.assetCode,
        asset.name,
        asset.category,
        asset.serialNumber,
        asset.vendor?.name,
        employeeName(asset.assignedEmployeeId),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalized || searchable.includes(normalized);
      return matchesStatus && matchesCategory && matchesQuery;
    });
  }, [assets, categoryFilter, query, statusFilter]);

  const totalValue = useMemo(
    () => assets.reduce((sum, item) => sum + Number(item.purchaseCost || 0), 0),
    [assets],
  );

  const assignedCount = assets.filter((asset) => asset.status === "ASSIGNED").length;
  const inStockCount = assets.filter((asset) => asset.status === "IN_STOCK").length;
  const maintenanceCount = assets.filter((asset) => asset.status === "MAINTENANCE").length;

  const closeImport = () => {
    if (importBusy) return;
    setImportOpen(false);
    setImportFileName("");
    setImportRows([]);
    setImportResult(null);
    setImportMode("VALID_ROWS_ONLY");
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportBusy(true);
    setImportResult(null);
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
      toast.success(`Đã import ${result.importedRows} tài sản.`);
      await refresh();
    } catch {
      toast.error("Backend import đang chờ bạn implement phần lưu dữ liệu.");
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <section className="asset-page panel">
      <PanelHeader
        title="Danh sách tài sản"
        action={canManage}
        onAdd={() => openModal({ type: "asset", mode: "create" })}
      />

      <div className="asset-summary-grid">
        <AssetMetric label="Tổng tài sản" value={assets.length} icon={<FiBox />} accent />
        <AssetMetric label="Đã cấp phát" value={assignedCount} icon={<FiUserCheck />} />
        <AssetMetric label="Trong kho" value={inStockCount} icon={<FiArchive />} />
        <AssetMetric label="Bảo trì" value={maintenanceCount} icon={<FiTool />} />
      </div>

      <div className="asset-toolbar">
        {canManage && (
          <button
            type="button"
            className="asset-import-button"
            onClick={() => setImportOpen(true)}
          >
            <FiUpload /> Tải lên file Excel
          </button>
        )}
        <label className="asset-search">
          <FiSearch />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo mã, tên, serial, nhà cung cấp..."
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as AssetStatusFilter)}
        >
          {(["ALL", "IN_STOCK", "ASSIGNED", "MAINTENANCE", "DISPOSED"] as const).map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="ALL">Tất cả nhóm tài sản</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="asset-list-panel">
        <div className="asset-list-head">
          <div>
            <strong>{filteredAssets.length} tài sản</strong>
            <span>Tổng giá trị: {money.format(totalValue)}</span>
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
                  <th>Phân loại</th>
                  <th>Người dùng</th>
                  <th>Vị trí</th>
                  <th>Giá trị</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="asset-name-cell">
                        <strong>{item.name}</strong>
                        <span>{item.assetCode}</span>
                        {item.serialNumber && <small>Serial: {item.serialNumber}</small>}
                      </div>
                    </td>
                    <td>
                      <div className="asset-muted-stack">
                        <strong>{item.category}</strong>
                        <span>{item.vendor?.name || "Chưa có nhà cung cấp"}</span>
                      </div>
                    </td>
                    <td>
                      <span className="muted-cell">{employeeName(item.assignedEmployeeId)}</span>
                    </td>
                    <td>
                      <div className="asset-muted-stack">
                        <span>{departmentName(item.departmentId)}</span>
                        <small>
                          {siteName(item.siteId)} · {projectName(item.projectId)}
                        </small>
                      </div>
                    </td>
                    <td>{money.format(Number(item.purchaseCost || 0))}</td>
                    <td>
                      <StatusBadge value={item.status} />
                    </td>
                    <td>
                      {canManage && (
                        <AssetActions
                          item={item}
                          onEdit={() => openModal({ type: "asset", mode: "edit", item })}
                          onDelete={() => void deleteResource("assets", item.id)}
                          onRevoke={() => void revokeAsset(item)}
                          onDispose={() => void disposeAssetAction(item)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {importOpen && (
        <div className="modal-backdrop">
          <div className="crud-modal asset-import-modal">
            <div className="modal-head">
              <div className="modal-title-group">
                <span className="modal-title-icon create">
                  <FiFileText />
                </span>
                <div>
                  <h2>Nhập danh sách tài sản</h2>
                  <p>Frontend đọc Excel, backend nhận JSON để kiểm tra và lưu dữ liệu.</p>
                </div>
              </div>
              <button type="button" className="icon-button" onClick={closeImport}>
                <FiX />
              </button>
            </div>

            <div className="asset-import-body">
              <label className="asset-import-dropzone">
                <FiUpload />
                <strong>{importFileName || "Chọn file Excel danh sách tài sản"}</strong>
                <span>Hỗ trợ file mẫu sheet HoSoTaiSan_import, định dạng .xlsx hoặc .xls</span>
                <input type="file" accept=".xlsx,.xls" onChange={handleImportFile} />
              </label>

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

              <div className="asset-import-options">
                <label>
                  <span>Chế độ import</span>
                  <select
                    value={importMode}
                    onChange={(event) => setImportMode(event.target.value as ImportMode)}
                  >
                    <option value="VALID_ROWS_ONLY">Chỉ nhập dòng hợp lệ</option>
                    <option value="ALL_OR_NOTHING">Tất cả hợp lệ mới nhập</option>
                  </select>
                </label>
              </div>

              <div className="asset-import-preview">
                {importRows.length === 0 ? (
                  <div className="empty-state">Chọn file Excel để xem dữ liệu trước khi import.</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Dòng</th>
                        <th>Tài sản</th>
                        <th>Danh mục</th>
                        <th>Phân loại</th>
                        <th>Serial/MAC</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(importResult?.rows ?? importRows.slice(0, 8)).map((row) => {
                        const isResultRow = "errors" in row;
                        const source: AssetImportRowPayload | undefined = isResultRow
                          ? importRows.find((item) => item.rowNumber === row.rowNumber)
                          : row;
                        const status = isResultRow ? row.status : undefined;
                        return (
                          <tr key={row.rowNumber} data-status={status}>
                            <td>{row.rowNumber}</td>
                            <td>
                              <div className="asset-name-cell">
                                <strong>
                                  {isResultRow ? row.assetName : source?.name || "—"}
                                </strong>
                                {source?.assetCode && <span>{source.assetCode}</span>}
                              </div>
                            </td>
                            <td>{isResultRow ? row.categoryCode : source?.categoryCode}</td>
                            <td>{source?.assetClass || "—"}</td>
                            <td>{source?.serialNumber || "—"}</td>
                            <td>
                              {status ? (
                                <span className="asset-import-row-status">
                                  {status === "VALID" || status === "WARNING" ? (
                                    <FiCheckCircle />
                                  ) : (
                                    <FiX />
                                  )}
                                  {status}
                                </span>
                              ) : (
                                source?.status || "—"
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

            <div className="modal-actions">
              <button type="button" onClick={closeImport} disabled={importBusy}>
                Hủy
              </button>
              {importResult && (
                <button
                  type="button"
                  onClick={() => downloadImportCsv(importResult)}
                  disabled={importBusy}
                >
                  <FiDownload /> Tải kết quả
                </button>
              )}
              <button
                type="button"
                onClick={handleValidateImport}
                disabled={importBusy || importRows.length === 0}
              >
                Kiểm tra dữ liệu
              </button>
              <button
                type="button"
                className="primary-action"
                onClick={handleCommitImport}
                disabled={importBusy || importRows.length === 0}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
