import type { Workbook, Worksheet } from "exceljs";
import type {
  AssetCategoryImportRowPayload,
  AssetCategoryImportValidationResponse,
  AssetCategoryTree,
} from "../services/types";

export const CATEGORY_REFERENCE_SHEET_NAME = "Loai_ThamChieu";
export const CATEGORY_TREE_SHEET_NAME = "Cay_PhanLoai";
const LEGACY_CATEGORY_REFERENCE_SHEET_NAME = "DanhMuc_ThamChieu";

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
    rows.push([
      "Loại tài sản",
      node.code,
      node.name,
      node.parentId ? fallbackParentCode : node.assetClass,
    ]);
    node.children.forEach((child) => {
      visit(child, node.code);
    });
  };
  categories.forEach((root) => {
    visit(root);
  });
  return rows;
}

function categoryRows(categories: AssetCategoryTree[]) {
  const seen = new Set<string>();
  return [...baseCategoryReferenceRows, ...flattenCategoryRows(categories)].filter((row) => {
    if (seen.has(row[1])) return false;
    seen.add(row[1]);
    return true;
  });
}

function leafOptionsByRoot(categories: AssetCategoryTree[], rootCode: string) {
  const children = new Map<string, string[]>();
  const labels = new Map<string, string>();
  categoryRows(categories).forEach(([, code, label, parentCode]) => {
    labels.set(code, label);
    if (!parentCode) return;
    children.set(parentCode, [...(children.get(parentCode) ?? []), code]);
  });

  const leaves: string[] = [];
  const visit = (code: string, path: Set<string>) => {
    if (path.has(code)) return;
    const directChildren = children.get(code) ?? [];
    if (code !== rootCode && directChildren.length === 0) {
      leaves.push(code);
      return;
    }
    const nextPath = new Set(path).add(code);
    directChildren.forEach((child) => {
      visit(child, nextPath);
    });
  };
  visit(rootCode, new Set());
  return leaves.map((code) => `${labels.get(code) ?? code} (${code})`);
}

function findCategory(
  categories: AssetCategoryTree[],
  code: string,
): AssetCategoryTree | undefined {
  for (const category of categories) {
    if (category.code === code) return category;
    const found = findCategory(category.children, code);
    if (found) return found;
  }
  return undefined;
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
    { header: "Loại cha", key: "parentCode", width: 24 },
  ];

  const rows = [
    ...categoryRows(options.categories ?? []),
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
    if (rowNumber === 1) row.height = 24;
    row.eachCell((cell) => {
      cell.font = { ...cell.font, name: "Calibri", size: 13 };
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

export function addHierarchicalCategorySheet(workbook: Workbook, categories: AssetCategoryTree[]) {
  const sheet = workbook.addWorksheet(CATEGORY_TREE_SHEET_NAME);

  const getMaxDepth = (nodes: AssetCategoryTree[], currentDepth = 0): number => {
    let max = currentDepth;
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        max = Math.max(max, getMaxDepth(node.children, currentDepth + 1));
      }
    }
    return max;
  };
  const maxDepth = Math.max(0, getMaxDepth(categories));

  const cols = [];
  for (let i = 0; i <= maxDepth; i++) {
    cols.push({ header: `Loại tài sản cấp ${i + 1}`, key: `level_${i}`, width: 30 });
  }
  cols.push({ header: "Mã", key: "code", width: 24 });
  cols.push({ header: "Loại tài sản", key: "assetClass", width: 24 });
  sheet.columns = cols;

  const addRow = (node: AssetCategoryTree, depth: number) => {
    const rowData: Record<string, string> = {
      code: node.code,
      assetClass: node.assetClass,
    };
    rowData[`level_${depth}`] = node.name;
    sheet.addRow(rowData);
    node.children.forEach((child) => {
      addRow(child, depth + 1);
    });
  };
  categories.forEach((root) => {
    addRow(root, 0);
  });

  const levelColors = [
    "FFE0F2FE", // Level 1 - sky 100
    "FFECFCCB", // Level 2 - lime 100
    "FFFEF9C3", // Level 3 - yellow 100
    "FFFFEDD5", // Level 4 - orange 100
    "FFFCE7F3", // Level 5 - pink 100
    "FFF3E8FF", // Level 6 - purple 100
    "FFEDE9FE", // Level 7
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { name: "Calibri", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.height = 24;
      return;
    }
    row.eachCell((cell, colNumber) => {
      cell.font = { ...cell.font, name: "Calibri", size: 13 };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9E2EC" } },
        left: { style: "thin", color: { argb: "FFD9E2EC" } },
        bottom: { style: "thin", color: { argb: "FFD9E2EC" } },
        right: { style: "thin", color: { argb: "FFD9E2EC" } },
      };

      if (colNumber <= maxDepth + 1) {
        // Color the category columns based on depth
        const color = levelColors[(colNumber - 1) % levelColors.length];
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      }
    });
  });

  return sheet;
}

export function addAssetCategoryDropdowns(
  workbook: Workbook,
  sheet: Worksheet,
  categories: AssetCategoryTree[],
  startRow = 5,
  endRow = 1000,
) {
  const referenceSheet = workbook.getWorksheet(CATEGORY_REFERENCE_SHEET_NAME);
  if (!referenceSheet) throw new Error(`Không tìm thấy sheet ${CATEGORY_REFERENCE_SHEET_NAME}.`);

  const fallbackLabels = new Map([
    ["FIXED_ASSET", "Tài sản cố định"],
    ["TOOL_EQUIPMENT", "Công cụ dụng cụ"],
  ]);
  const roots = ["FIXED_ASSET", "TOOL_EQUIPMENT"].map((code) => {
    const node = findCategory(categories, code);
    return { code, label: node?.name ?? fallbackLabels.get(code) ?? code };
  });
  const rootLabel = (code: string) => roots.find((root) => root.code === code)?.label ?? code;
  const branchLabel = (canonicalCode: string, fallback: string) =>
    findCategory(categories, canonicalCode)?.name ?? fallback;
  const branches = [
    {
      rootCode: "FIXED_ASSET",
      rootLabel: rootLabel("FIXED_ASSET"),
      code: "TANGIBLE",
      label: branchLabel("TANGIBLE", "Hữu hình"),
    },
    {
      rootCode: "FIXED_ASSET",
      rootLabel: rootLabel("FIXED_ASSET"),
      code: "INTANGIBLE",
      label: branchLabel("INTANGIBLE", "Vô hình"),
    },
    {
      rootCode: "TOOL_EQUIPMENT",
      rootLabel: rootLabel("TOOL_EQUIPMENT"),
      code: "SINGLE_USE",
      label: branchLabel("SINGLE_USE", "Dùng một lần"),
    },
    {
      rootCode: "TOOL_EQUIPMENT",
      rootLabel: rootLabel("TOOL_EQUIPMENT"),
      code: "MULTI_USE",
      label: branchLabel("MULTI_USE", "Dùng nhiều lần"),
    },
  ];
  const lists: Array<[string, string[]]> = [
    ["ASSET_CLASSES", roots.map((root) => root.label)],
    ...roots.map(
      (root) =>
        [
          root.code,
          branches.filter((branch) => branch.rootCode === root.code).map((branch) => branch.label),
        ] as [string, string[]],
    ),
    ...branches.map(
      (branch) => [branch.code, leafOptionsByRoot(categories, branch.code)] as [string, string[]],
    ),
    ["EMPTY_LIST", [""]],
  ];

  lists.forEach(([name, values], index) => {
    const column = referenceSheet.getColumn(6 + index);
    column.hidden = true;
    column.values = [name, ...(values.length ? values : [""])];
    const letter = column.letter;
    workbook.definedNames.add(
      `'${CATEGORY_REFERENCE_SHEET_NAME}'!$${letter}$2:$${letter}$${Math.max(2, values.length + 1)}`,
      name,
    );
  });

  const mapStartColumn = 6 + lists.length;
  const rootMapLabelColumn = referenceSheet.getColumn(mapStartColumn);
  const rootMapValueColumn = referenceSheet.getColumn(mapStartColumn + 1);
  rootMapLabelColumn.hidden = true;
  rootMapValueColumn.hidden = true;
  rootMapLabelColumn.values = ["CATEGORY_ROOT_LABEL", ...roots.map((root) => root.label)];
  rootMapValueColumn.values = ["CATEGORY_ROOT_LIST", ...roots.map((root) => root.code)];
  workbook.definedNames.add(
    `'${CATEGORY_REFERENCE_SHEET_NAME}'!$${rootMapLabelColumn.letter}$2:$${rootMapValueColumn.letter}$${roots.length + 1}`,
    "CATEGORY_ROOT_MAP",
  );

  const branchMapKeyColumn = referenceSheet.getColumn(mapStartColumn + 2);
  const branchMapValueColumn = referenceSheet.getColumn(mapStartColumn + 3);
  branchMapKeyColumn.hidden = true;
  branchMapValueColumn.hidden = true;
  branchMapKeyColumn.values = [
    "CATEGORY_BRANCH_KEY",
    ...branches.map((branch) => `${branch.rootLabel}|${branch.label}`),
  ];
  branchMapValueColumn.values = ["CATEGORY_BRANCH_LIST", ...branches.map((branch) => branch.code)];
  workbook.definedNames.add(
    `'${CATEGORY_REFERENCE_SHEET_NAME}'!$${branchMapKeyColumn.letter}$2:$${branchMapValueColumn.letter}$${branches.length + 1}`,
    "CATEGORY_BRANCH_MAP",
  );

  for (let row = startRow; row <= endRow; row += 1) {
    sheet.getCell(`G${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ["ASSET_CLASSES"],
      showErrorMessage: true,
      errorTitle: "Sai phân loại",
      error: "Chọn một giá trị trong danh sách.",
    };
    sheet.getCell(`H${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [`INDIRECT(IFERROR(VLOOKUP($G${row},CATEGORY_ROOT_MAP,2,FALSE),"EMPTY_LIST"))`],
      showErrorMessage: true,
      errorTitle: "Sai phân loại lớp con",
      error: "Chọn lớp con thuộc phân loại đã chọn.",
    };
    sheet.getCell(`I${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [
        `INDIRECT(IFERROR(VLOOKUP($G${row}&"|"&$H${row},CATEGORY_BRANCH_MAP,2,FALSE),"EMPTY_LIST"))`,
      ],
      showErrorMessage: true,
      errorTitle: "Sai loại tài sản",
      error: "Chọn loại cuối cùng thuộc lớp con đã chọn.",
    };
  }
}

export async function downloadCategoryImportTemplate(categories: AssetCategoryTree[]) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BIMLAB QLVT";
  workbook.created = new Date();
  addCategoryReferenceSheet(workbook, { categories, includeStatuses: false });
  addHierarchicalCategorySheet(workbook, categories);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mau_download_danh_muc_tai_san_bimlab.xlsx";
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
  const sheet =
    workbook.getWorksheet(CATEGORY_REFERENCE_SHEET_NAME) ??
    workbook.getWorksheet(LEGACY_CATEGORY_REFERENCE_SHEET_NAME);
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
      if (normalized === "loai cha" || normalized === "danh muc cha") {
        columnMap.set("parentCode", index);
      }
    });
    if (columnMap.has("group") && columnMap.has("code") && columnMap.has("name")) {
      headerRowNumber = rowNumber;
    }
  });

  if (!headerRowNumber) {
    throw new Error("Sheet phân loại thiếu dòng tiêu đề Nhóm, Mã/Giá trị nhập, Diễn giải.");
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
