import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetCatalogItemsPage } from "./AssetCatalogItemsPage";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  deactivate: vi.fn(),
  loadDetail: vi.fn(),
  loadItems: vi.fn(),
  loadCategories: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../services/api", () => ({
  createAssetCatalogItem: mocks.create,
  deactivateAssetCatalogItem: mocks.deactivate,
  loadAssetCatalogItem: mocks.loadDetail,
  loadAssetCatalogItems: mocks.loadItems,
  loadAssetCategories: mocks.loadCategories,
  updateAssetCatalogItem: mocks.update,
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

vi.mock("../components/forms/AssetCategoryTreeSelect", () => ({
  AssetCategoryTreeSelect: ({
    onChange,
  }: {
    onChange: (name: string, code?: string, id?: number) => void;
  }) => (
    <button type="button" onClick={() => onChange("Màn hình", "MON", 10)}>
      Chọn loại Màn hình
    </button>
  ),
}));

describe("AssetCatalogItemsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadItems.mockResolvedValue([
      {
        id: 1,
        itemCode: "MON-LG-27",
        name: "Màn hình LG 27 inch",
        catalogType: "ASSET",
        categoryId: 10,
        categoryCode: "MON",
        categoryName: "Màn hình",
        unit: "Cái",
        active: true,
      },
    ]);
    mocks.loadCategories.mockResolvedValue([
      {
        id: 10,
        code: "MON",
        name: "Màn hình",
        assetClass: "FIXED_ASSET",
        active: true,
      },
    ]);
    mocks.create.mockResolvedValue({ id: 2 });
  });

  it("lists and creates a catalog item with its asset category", async () => {
    const user = userEvent.setup();
    render(<AssetCatalogItemsPage />);

    expect(await screen.findByText("MON-LG-27")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Thêm danh mục/i }));
    expect(screen.getByLabelText(/Mã danh mục/i)).toBeDisabled();
    await user.type(screen.getByLabelText(/Tên danh mục/i), "Bộ máy tính TCN19");
    await user.click(screen.getByRole("button", { name: "Chọn loại Màn hình" }));
    await user.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Bộ máy tính TCN19",
          categoryId: 10,
          catalogType: "ASSET",
        }),
      ),
    );
  });
});
