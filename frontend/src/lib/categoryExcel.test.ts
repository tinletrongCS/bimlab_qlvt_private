import { Workbook } from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addAssetCategoryDropdowns,
  addCategoryReferenceSheet,
  addHierarchicalCategorySheet,
  CATEGORY_REFERENCE_SHEET_NAME,
  CATEGORY_TREE_SHEET_NAME,
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

  it("supports a category-only reference sheet and requires it for dropdowns", () => {
    const workbook = new Workbook();
    const sheet = addCategoryReferenceSheet(workbook, {
      categories: [],
      includeStatuses: false,
    });

    expect(sheet.rowCount).toBe(7);
    expect(addCategoryReferenceSheet(new Workbook()).rowCount).toBe(13);
    expect(() => addAssetCategoryDropdowns(new Workbook(), sheet, [], 5, 5)).toThrow(
      CATEGORY_REFERENCE_SHEET_NAME,
    );
  });

  it("adds dependent asset type dropdowns with leaf category values", () => {
    const workbook = new Workbook();
    const hierarchy = [
      {
        id: 10,
        code: "FIXED_ASSET",
        name: "Tài sản cố định",
        assetClass: "FIXED_ASSET",
        parentId: null,
        active: true,
        children: [
          {
            id: 11,
            code: "TANGIBLE",
            name: "Hữu hình",
            assetClass: "FIXED_ASSET",
            parentId: 10,
            active: true,
            children: [
              {
                id: 12,
                code: "TSCD_MONITOR",
                name: "Màn hình",
                assetClass: "FIXED_ASSET",
                parentId: 11,
                active: true,
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: 20,
        code: "TOOL_EQUIPMENT",
        name: "Công cụ dụng cụ",
        assetClass: "TOOL_EQUIPMENT",
        parentId: null,
        active: true,
        children: [
          {
            id: 21,
            code: "MULTI_USE",
            name: "Công cụ nhiều kỳ",
            assetClass: "TOOL_EQUIPMENT",
            parentId: 20,
            active: true,
            children: [
              {
                id: 22,
                code: "TOOL_MULTI_IT",
                name: "Thiết bị CNTT",
                assetClass: "TOOL_EQUIPMENT",
                parentId: 21,
                active: true,
                children: [],
              },
            ],
          },
        ],
      },
    ] as any;
    const referenceSheet = addCategoryReferenceSheet(workbook, { categories: hierarchy });
    const treeSheet = addHierarchicalCategorySheet(workbook, hierarchy);
    const sheet = workbook.addWorksheet("Thiết bị");

    addAssetCategoryDropdowns(workbook, sheet, hierarchy, 5, 6);

    expect(sheet.getCell("G5").dataValidation.formulae).toEqual(["ASSET_CLASSES"]);
    expect(sheet.getCell("H5").dataValidation.formulae[0]).toContain(
      "VLOOKUP($G5,CATEGORY_ROOT_MAP",
    );
    expect(sheet.getCell("I6").dataValidation.formulae[0]).toContain(
      'VLOOKUP($G6&"|"&$H6,CATEGORY_BRANCH_MAP',
    );
    expect(workbook.definedNames.getRanges("TANGIBLE").ranges).toEqual(["'Loai_ThamChieu'!$I$2"]);
    expect(workbook.definedNames.getRanges("MULTI_USE").ranges).toEqual(["'Loai_ThamChieu'!$L$2"]);
    expect(referenceSheet.getCell("I2").value).toBe("Màn hình (TSCD_MONITOR)");
    expect(referenceSheet.getCell("L2").value).toBe("Thiết bị CNTT (TOOL_MULTI_IT)");
    expect(treeSheet.name).toBe(CATEGORY_TREE_SHEET_NAME);
    expect(treeSheet.getColumn(3).values).toContain("Màn hình");
  });

  it("parses normalized headers, rich cells, formulas, and skips blank rows", async () => {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet(CATEGORY_REFERENCE_SHEET_NAME);
    sheet.addRow(["ignored"]);
    sheet.addRow(["Nhóm", "Mã giá trị nhập", "Diễn giải", "Loại cha"]);
    sheet.addRow(["Loại tài sản", "LAP", { formula: '"Laptop"', result: "Laptop" }, "ROOT"]);
    sheet.addRow([]);
    const buffer = await workbook.xlsx.writeBuffer();
    const file = { arrayBuffer: async () => buffer } as File;

    await expect(parseCategoryReferenceSheet(file)).resolves.toEqual([
      {
        rowNumber: 3,
        group: "Loại tài sản",
        code: "LAP",
        name: "Laptop",
        parentCode: "ROOT",
      },
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
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    await downloadCategoryImportTemplate(categories);

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:template");
  });
});
