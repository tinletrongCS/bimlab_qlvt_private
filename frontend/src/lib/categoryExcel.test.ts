import { Workbook } from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CATEGORY_REFERENCE_SHEET_NAME,
  addCategoryReferenceSheet,
  downloadCategoryImportTemplate,
  emptyCategoryImportResult,
  parseCategoryReferenceSheet,
} from "./categoryExcel";

const categories = [
  {
    id: 1,
    code: "ROOT",
    name: "Thiết bị",
    assetClass: "FIXED_ASSET",
    parentId: null,
    active: true,
    children: [
      {
        id: 2,
        code: "LAP",
        name: "Laptop",
        assetClass: "FIXED_ASSET",
        parentId: 1,
        active: true,
        children: [],
      },
    ],
  },
] as any;

describe("category Excel", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("adds styled reference rows including nested categories", () => {
    const workbook = new Workbook();

    const sheet = addCategoryReferenceSheet(workbook, { categories });

    expect(sheet.name).toBe(CATEGORY_REFERENCE_SHEET_NAME);
    expect(sheet.rowCount).toBe(15);
    expect(sheet.getRow(1).height).toBe(24);
    expect(sheet.getRow(9).getCell(2).value).toBe("LAP");
    expect(sheet.getRow(9).getCell(4).value).toBe("ROOT");
  });

  it("parses normalized headers, rich cells, formulas, and skips blank rows", async () => {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet(CATEGORY_REFERENCE_SHEET_NAME);
    sheet.addRow(["ignored"]);
    sheet.addRow(["Nhóm", "Mã giá trị nhập", "Diễn giải", "Danh mục cha"]);
    sheet.addRow(["Danh mục", "LAP", { formula: '"Laptop"', result: "Laptop" }, "ROOT"]);
    sheet.addRow([]);
    const buffer = await workbook.xlsx.writeBuffer();
    const file = { arrayBuffer: async () => buffer } as File;

    await expect(parseCategoryReferenceSheet(file)).resolves.toEqual([
      { rowNumber: 3, group: "Danh mục", code: "LAP", name: "Laptop", parentCode: "ROOT" },
    ]);
  });

  it("rejects missing sheet and missing required headers", async () => {
    const missingSheet = new Workbook();
    const missingSheetBuffer = await missingSheet.xlsx.writeBuffer();
    await expect(
      parseCategoryReferenceSheet({ arrayBuffer: async () => missingSheetBuffer } as File),
    ).rejects.toThrow(CATEGORY_REFERENCE_SHEET_NAME);

    const missingHeaders = new Workbook();
    missingHeaders.addWorksheet(CATEGORY_REFERENCE_SHEET_NAME).addRow(["Sai", "Header"]);
    const missingHeadersBuffer = await missingHeaders.xlsx.writeBuffer();
    await expect(
      parseCategoryReferenceSheet({ arrayBuffer: async () => missingHeadersBuffer } as File),
    ).rejects.toThrow("thiếu dòng tiêu đề");
  });

  it("builds pending validation rows", () => {
    expect(
      emptyCategoryImportResult([
        { rowNumber: 2, group: "Danh mục", code: "LAP", name: "Laptop", parentCode: "ROOT" },
      ]),
    ).toEqual(
      expect.objectContaining({
        uploadStatus: "PENDING",
        totalRows: 1,
        rows: [expect.objectContaining({ status: "PENDING", code: "LAP" })],
      }),
    );
  });

  it("downloads generated template and revokes blob URL", async () => {
    const createObjectURL = vi.fn(() => "blob:template");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    await downloadCategoryImportTemplate(categories);

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:template");
  });
});
