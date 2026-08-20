import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    disabled,
  }: {
    onChange: (name: string, code?: string, id?: number) => void;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled} onClick={() => onChange("Màn hình", "MON", 10)}>
      Chọn loại Màn hình
    </button>
  ),
}));

describe("AssetCatalogItemsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
    mocks.update.mockResolvedValue({});
    mocks.deactivate.mockResolvedValue(undefined);
    mocks.loadDetail.mockResolvedValue({
      id: 1,
      itemCode: "MON-LG-27",
      name: "Màn hình LG 27 inch",
      catalogType: "ASSET",
      categoryId: 10,
      categoryCode: "MON",
      categoryName: "Màn hình",
      unit: "CAI",
      active: true,
    });
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

  it("views details before editing and deactivates an existing catalog item", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AssetCatalogItemsPage />);
    expect(await screen.findByText("MON-LG-27")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Mở thao tác cho Màn hình LG 27 inch" }));
    await user.click(await screen.findByRole("menuitem", { name: "Xem chi tiết" }));
    expect(await screen.findByRole("heading", { name: "Chi tiết danh mục" })).toBeVisible();
    const name = screen.getByLabelText(/Tên danh mục/i);
    expect(name).toBeDisabled();
    expect(screen.getByLabelText(/Nhóm kiểm kê/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Chọn loại Màn hình" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Lưu" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cập nhật" }));
    expect(screen.getByRole("heading", { name: "Cập nhật danh mục" })).toBeVisible();
    expect(name).toBeEnabled();
    expect(screen.getByLabelText(/Nhóm kiểm kê/i)).toBeEnabled();
    expect(screen.getByRole("button", { name: "Chọn loại Màn hình" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Lưu" })).toBeVisible();
    expect(mocks.update).not.toHaveBeenCalled();
    await user.clear(name);
    await user.type(name, "Màn hình LG cập nhật");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: "Màn hình LG cập nhật", categoryId: 10 }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Mở thao tác cho Màn hình LG 27 inch" }));
    await user.click(await screen.findByRole("menuitem", { name: "Ngừng cho phép gán" }));
    await waitFor(() => expect(mocks.deactivate).toHaveBeenCalledWith(1));
  });

  it("configures columns and deactivates selected active catalogs", async () => {
    const user = userEvent.setup();
    const initialItems = [
      {
        id: 1,
        itemCode: "MON-1",
        name: "Màn hình 1",
        catalogType: "ASSET",
        categoryId: 10,
        categoryCode: "MON",
        categoryName: "Màn hình",
        active: true,
      },
      {
        id: 2,
        itemCode: "MON-2",
        name: "Màn hình 2",
        catalogType: "ASSET",
        categoryId: 10,
        categoryCode: "MON",
        categoryName: "Màn hình",
        active: true,
      },
      {
        id: 3,
        itemCode: "MON-3",
        name: "Màn hình cũ",
        catalogType: "ASSET",
        categoryId: 10,
        categoryCode: "MON",
        categoryName: "Màn hình",
        active: false,
      },
    ];
    mocks.loadItems.mockReset().mockResolvedValue(initialItems);
    mocks.deactivate.mockImplementation((id: number) =>
      id === 2 ? Promise.reject(new Error("failed")) : Promise.resolve(),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AssetCatalogItemsPage />);
    expect(await screen.findByText("MON-1")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Cấu hình cột" }));
    const columnDialog = screen.getByRole("dialog", { name: "Cấu hình cột" });
    fireEvent.click(within(columnDialog).getByLabelText("Đơn vị tính"));
    await user.click(within(columnDialog).getByRole("button", { name: /Mặc định/i }));
    await user.click(within(columnDialog).getByRole("button", { name: "Áp dụng" }));

    await user.click(screen.getByRole("button", { name: "Chọn nhiều" }));
    fireEvent.click(
      screen.getByTitle("Chọn Màn hình 1").querySelector("input") as HTMLInputElement,
    );
    fireEvent.click(
      screen.getByTitle("Chọn Màn hình 2").querySelector("input") as HTMLInputElement,
    );
    expect(screen.getByText("2 danh mục đã chọn")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Ngừng cho phép gán (2)" }));

    await waitFor(() => {
      expect(mocks.deactivate).toHaveBeenCalledWith(1);
      expect(mocks.deactivate).toHaveBeenCalledWith(2);
      expect(screen.getByText("1 danh mục đã chọn")).toBeVisible();
    });
    await user.click(screen.getByRole("button", { name: "Bỏ chọn" }));
    expect(screen.queryByText(/danh mục đã chọn/)).not.toBeInTheDocument();
  });
});
