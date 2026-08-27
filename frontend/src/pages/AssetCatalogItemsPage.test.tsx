import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetCatalogItemsPage } from "./AssetCatalogItemsPage";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  deactivate: vi.fn(),
  deletePermanent: vi.fn(),
  loadAssignedAssets: vi.fn(),
  loadDepartments: vi.fn(),
  loadDetail: vi.fn(),
  loadItems: vi.fn(),
  loadCategories: vi.fn(),
  loadWorkSites: vi.fn(),
  toastError: vi.fn(),
  unassign: vi.fn(),
  update: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: mocks.toastError, success: vi.fn() },
}));

vi.mock("../services/api", () => ({
  createAssetCatalogItem: mocks.create,
  deactivateAssetCatalogItem: mocks.deactivate,
  deleteAssetCatalogItemPermanently: mocks.deletePermanent,
  loadAssetCatalogItem: mocks.loadDetail,
  loadAssetCatalogItems: mocks.loadItems,
  loadAssetCategories: mocks.loadCategories,
  loadAssetsByCatalogItem: mocks.loadAssignedAssets,
  loadDepartments: mocks.loadDepartments,
  loadWorkSites: mocks.loadWorkSites,
  unassignAssetCatalogItems: mocks.unassign,
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
    mocks.deletePermanent.mockResolvedValue(undefined);
    mocks.update.mockResolvedValue({});
    mocks.deactivate.mockResolvedValue(undefined);
    mocks.loadAssignedAssets.mockResolvedValue([]);
    mocks.loadDepartments.mockResolvedValue([]);
    mocks.loadWorkSites.mockResolvedValue([]);
    mocks.unassign.mockResolvedValue(undefined);
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
    mocks.loadAssignedAssets.mockResolvedValue([
      {
        id: 101,
        assetCode: "CCDC-MON-001",
        name: "Màn hình phòng họp",
        category: "Màn hình",
        status: "IN_STOCK",
        siteId: 7,
        departmentId: 8,
      },
      {
        id: 102,
        assetCode: "CCDC-MON-002",
        name: "Màn hình lỗi",
        category: "Màn hình",
        status: "LOST",
        siteId: 7,
        departmentId: 8,
      },
    ]);
    mocks.loadDepartments.mockResolvedValue([{ id: 8, name: "Phòng Công nghệ" }]);
    mocks.loadWorkSites.mockResolvedValue([{ id: 7, name: "Chi nhánh HCM" }]);
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
    expect(await screen.findByRole("heading", { name: "Tài sản đang gán danh mục" })).toBeVisible();
    expect(await screen.findByText("CCDC-MON-001")).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Chi nhánh" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Phòng ban" })).toBeVisible();
    expect(screen.getByText("Trong kho")).toBeVisible();
    expect(screen.getByText("Mất/hỏng")).toBeVisible();
    expect(screen.queryByText("IN_STOCK")).not.toBeInTheDocument();
    expect(screen.queryByText("LOST")).not.toBeInTheDocument();
    expect(screen.getAllByText("Chi nhánh HCM")).toHaveLength(2);
    expect(screen.getAllByText("Phòng Công nghệ")).toHaveLength(2);
    await user.click(screen.getByText("CCDC-MON-001"));
    expect(screen.getByRole("button", { name: "Gỡ gán (1)" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Ngừng và gỡ tất cả" }));
    await waitFor(() => expect(mocks.deactivate).toHaveBeenCalledWith(1));
  });

  it("shows the backend message when updating a catalog item fails", async () => {
    const user = userEvent.setup();
    mocks.update.mockRejectedValue({
      response: {
        data: { message: "Không được thay đổi danh mục do đã có tài sản dùng danh mục này" },
      },
    });
    render(<AssetCatalogItemsPage />);
    expect(await screen.findByText("MON-LG-27")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Mở thao tác cho Màn hình LG 27 inch" }));
    await user.click(await screen.findByRole("menuitem", { name: "Xem chi tiết" }));
    await user.click(screen.getByRole("button", { name: "Cập nhật" }));
    await user.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Không được thay đổi danh mục do đã có tài sản dùng danh mục này",
      ),
    );
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
