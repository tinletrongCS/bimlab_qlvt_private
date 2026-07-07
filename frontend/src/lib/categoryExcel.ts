import type { Workbook } from "exceljs";
import type {
  AssetCategoryTree,
  AssetCategoryImportRowPayload,
  AssetCategoryImportValidationResponse,
} from "../services/types";

export const CATEGORY_REFERENCE_SHEET_NAME = "DanhMuc_ThamChieu";

const baseCategoryReferenceRows = [
  ["Phân loại", "FIXED_ASSET", "Tài sản cố định", ""],
  ["Phân loại", "TOOL_EQUIPMENT", "Công cụ dụng cụ", ""],
  ["Loại tài sản cố định", "TANGIBLE", "Tài sản cố định hữu hình", "FIXED_ASSET"],
  ["Loại tài sản cố định", "INTANGIBLE", "Tài sản cố định vô hình", "FIXED_ASSET"],
  ["Loại công cụ dụng cụ", "SINGLE_USE", "Công cụ dụng cụ phân bổ 1 lần", "TOOL_EQUIPMENT"],
  ["Loại công cụ dụng cụ", "MULTI_USE", "Công cụ dụng cụ phân bổ nhiều lần", "TOOL_EQUIPMENT"],
] as const;

const statusReferenceRows = [
  ["Trạng thái", "IN_STOCK", "Trong kho", ""],
  ["Trạng thái", "ASSIGNED", "Đã cấp phát", ""],
  ["Trạng thái", "MAINTENANCE", "Đang bảo trì", ""],
  ["Trạng thái", "DISPOSED", "Đã thanh lý", ""],
  ["Trạng thái", "LOST", "Mất", ""],
  ["Trạng thái", "PENDING", "Chờ xử lý", ""],
] as const;

function flattenCategoryRows(categories: AssetCategoryTree[]) {
  const rows: string[][] = [];
  const visit = (node: AssetCategoryTree, fallbackParentCode = "") => {
    rows.push(["Danh mục", node.code, node.name, node.parentId ? fallbackParentCode : node.assetClass]);
    node.children.forEach((child) => visit(child, node.code));
  };
  categories.forEach((root) => visit(root));
  return rows;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function cellText(value: unknown) {
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) {
    return String((value as { text?: unknown }).text ?? "").trim();
  }
  if (typeof value === "object" && "result" in value) {
    return String((value as { result?: unknown }).result ?? "").trim();
  }
  return String(value).trim();
}

export function addCategoryReferenceSheet(
  workbook: Workbook,
  options: { categories?: AssetCategoryTree[]; includeStatuses?: boolean } = {},
) {
  const sheet = workbook.addWorksheet(CATEGORY_REFERENCE_SHEET_NAME);
  sheet.columns = [
    { header: "Nhóm", key: "group", width: 24 },
    { header: "Mã/Giá trị nhập", key: "code", width: 24 },
    { header: "Diễn giải", key: "label", width: 34 },
    { header: "Danh mục cha", key: "parentCode", width: 24 },
  ];

  const rows = [
    ...baseCategoryReferenceRows,
    ...flattenCategoryRows(options.categories ?? []),
    ...(options.includeStatuses === false ? [] : statusReferenceRows),
  ];

  rows.forEach(([group, code, label, parentCode]) => {
    sheet.addRow({ group, code, label, parentCode });
  });

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });

  sheet.eachRow((row, rowNumber) => {
    row.height = rowNumber === 1 ? 24 : 20;
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9E2EC" } },
        left: { style: "thin", color: { argb: "FFD9E2EC" } },
        bottom: { style: "thin", color: { argb: "FFD9E2EC" } },
        right: { style: "thin", color: { argb: "FFD9E2EC" } },
      };
      cell.alignment = { vertical: "middle", wrapText: true };
    });
  });

  return sheet;
}

export async function downloadCategoryImportTemplate(categories: AssetCategoryTree[]) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BIMLAB QLVT";
  workbook.created = new Date();
  addCategoryReferenceSheet(workbook, { categories, includeStatuses: false });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mau_import_danh_muc_tai_san_bimlab.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function parseCategoryReferenceSheet(
  file: File,
): Promise<AssetCategoryImportRowPayload[]> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.getWorksheet(CATEGORY_REFERENCE_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Không tìm thấy sheet ${CATEGORY_REFERENCE_SHEET_NAME}.`);
  }

  let headerRowNumber = 0;
  const columnMap = new Map<string, number>();
  sheet.eachRow((row, rowNumber) => {
    if (headerRowNumber) return;
    const values = row.values as unknown[];
    values.forEach((value, index) => {
      const normalized = normalize(cellText(value));
      if (normalized === "nhom") columnMap.set("group", index);
      if (normalized === "ma/gia tri nhap" || normalized === "ma gia tri nhap") {
        columnMap.set("code", index);
      }
      if (normalized === "dien giai") columnMap.set("name", index);
      if (normalized === "danh muc cha") columnMap.set("parentCode", index);
    });
    if (columnMap.has("group") && columnMap.has("code") && columnMap.has("name")) {
      headerRowNumber = rowNumber;
    }
  });

  if (!headerRowNumber) {
    throw new Error("Sheet danh mục thiếu dòng tiêu đề Nhóm, Mã/Giá trị nhập, Diễn giải.");
  }

  const rows: AssetCategoryImportRowPayload[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return;
    const group = cellText(row.getCell(columnMap.get("group") ?? 1).value);
    const code = cellText(row.getCell(columnMap.get("code") ?? 2).value);
    const name = cellText(row.getCell(columnMap.get("name") ?? 3).value);
    const parentCode = cellText(row.getCell(columnMap.get("parentCode") ?? 4).value);
    if (!group && !code && !name && !parentCode) return;
    rows.push({ rowNumber, group, code, name, parentCode });
  });

  return rows;
}

export function emptyCategoryImportResult(
  rows: AssetCategoryImportRowPayload[],
): AssetCategoryImportValidationResponse {
  return {
    uploadStatus: "PENDING",
    totalRows: rows.length,
    validRows: 0,
    errorRows: 0,
    warningRows: 0,
    rows: rows.map((row) => ({
      rowNumber: row.rowNumber,
      status: "PENDING",
      code: row.code ?? "",
      name: row.name ?? "",
      parentCode: row.parentCode,
      action: "PENDING",
      errors: [],
      warnings: [],
    })),
  };
}
