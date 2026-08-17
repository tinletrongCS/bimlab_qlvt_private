import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetsPage } from "../pages/AssetsPage";
import { BookingPage } from "../pages/BookingPage";
import { chooseSearchableOption } from "./searchableSelect";

const mocks = vi.hoisted(() => ({
  assignAssetCatalog: vi.fn(),
  cancelAssetBooking: vi.fn(),
  checkAssetBookingAvailability: vi.fn(),
  checkInAssetBooking: vi.fn(),
  checkOutAssetBooking: vi.fn(),
  commitAssetImport: vi.fn(),
  deleteAsset: vi.fn(),
  ensureAssetDetailLookups: vi.fn(),
  ensureAssets: vi.fn(),
  issueAssetQrCodes: vi.fn(),
  loadAssetBookings: vi.fn(),
  loadAssetChangeHistory: vi.fn(),
  loadAssetCategoryTree: vi.fn(),
  loadAssetCatalogItems: vi.fn(),
  loadAssets: vi.fn(),
  openModal: vi.fn(),
  toastError: vi.fn(),
  toastLoading: vi.fn(),
  toastSuccess: vi.fn(),
  updateAsset: vi.fn(),
  validateAssetImport: vi.fn(),
  createAssetBooking: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: mocks.toastError,
    loading: mocks.toastLoading,
    success: mocks.toastSuccess,
  },
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: "admin",
      role: "ADMIN",
      fullName: "Admin BIMLab",
      permissions: ["asset_access", "asset_manage", "asset_report_view"],
    },
    hasPermission: () => true,
  }),
}));

vi.mock("../contexts/ActionsContext", () => ({
  useActions: () => ({
    openModal: mocks.openModal,
  }),
}));

const vendor = {
  id: 1,
  name: "Công ty Thiết bị BIM",
  taxCode: "0101001001",
  status: "ACTIVE",
};

const categories = [
  {
    id: 1,
    code: "TB",
    name: "Thiết bị",
    assetClass: "FIXED_ASSET",
    parentId: null,
    description: "Nhóm thiết bị",
    active: true,
  },
  {
    id: 2,
    code: "LAP",
    name: "Laptop",
    assetClass: "FIXED_ASSET",
    parentId: 1,
    description: "Máy tính xách tay",
    active: true,
  },
  {
    id: 3,
    code: "ROOM",
    name: "Phòng họp",
    assetClass: "TOOL_EQUIPMENT",
    parentId: null,
    description: "Không gian họp",
    active: true,
  },
];

const categoryTree = [
  {
    ...categories[0],
    children: [{ ...categories[1], children: [] }],
  },
  {
    ...categories[2],
    children: [],
  },
];

const employees = [
  { id: 1, fullName: "Nguyễn Văn A", employeeCode: "E001", departmentName: "BIM" },
  { id: 2, fullName: "Trần Thị B", employeeCode: "E002", departmentName: "Admin" },
];

const departments = [
  { id: 1, name: "BIM" },
  { id: 2, name: "Hành chính" },
];

const workSites = [
  { id: 1, name: "Văn phòng HCM", active: true },
  { id: 2, name: "Văn phòng Hà Nội", active: true },
];

const projects = [{ id: 1, name: "Dự án Alpha", code: "ALPHA" }];

const laptopAsset = {
  id: 1,
  assetCode: "TS-001",
  name: "Laptop Dell Precision",
  catalogItem: { id: 1, itemCode: "MON-LG-27", name: "Màn hình LG 27 inch" },
  assetCategory: categories[1],
  category: "Laptop",
  serialNumber: "SN001",
  source: "PURCHASE",
  vendor,
  assignedEmployeeId: 1,
  departmentId: 1,
  siteId: 1,
  projectId: 1,
  useDate: "2026-07-01",
  depreciationStartDate: "2026-07-01",
  originalCost: 35_000_000,
  purchaseCost: 35_000_000,
  accumulatedDepreciation: 5_000_000,
  bookValue: 30_000_000,
  residualValue: 5_000_000,
  purchaseDate: "2026-06-15",
  warrantyUntil: "2027-06-15",
  status: "ASSIGNED",
  assetClass: "FIXED_ASSET",
  fixedAssetType: "MACHINERY",
  depreciationMethod: "STRAIGHT_LINE",
  usefulLifeMonths: 60,
  usefulLifeYears: 5,
  notes: "Máy dựng hình chính",
  createdAt: "2026-07-01T00:00:00",
  updatedAt: "2026-07-02T00:00:00",
};

const roomAsset = {
  id: 2,
  assetCode: "ROOM-01",
  name: "Phòng họp Apollo",
  assetCategory: categories[2],
  category: "Phòng họp",
  serialNumber: "ROOM-SN",
  source: "INTERNAL",
  departmentId: 2,
  siteId: 1,
  purchaseCost: 0,
  originalCost: 0,
  bookValue: 0,
  residualValue: 0,
  status: "IN_STOCK",
  assetClass: "TOOL_EQUIPMENT",
  fixedAssetType: "MEETING_ROOM",
  notes: "Có màn hình trình chiếu",
};

const assets = [laptopAsset, roomAsset];

const bookings = [
  {
    id: 1,
    assetId: 2,
    assetCode: "ROOM-01",
    assetName: "Phòng họp Apollo",
    bookingCode: "BK-001",
    title: "Họp điều phối",
    purpose: "Điều phối BIM",
    startTime: "2026-07-20T02:00:00.000Z",
    endTime: "2026-07-20T03:00:00.000Z",
    requestedByEmployeeId: 1,
    departmentId: 1,
    siteId: 1,
    projectId: 1,
    status: "CONFIRMED",
    autoRelease: true,
    createdBy: "admin",
    notes: "Chuẩn bị màn hình",
    createdAt: "2026-07-18T00:00:00.000Z",
    updatedAt: "2026-07-18T00:00:00.000Z",
  },
  {
    id: 2,
    assetId: 2,
    assetCode: "ROOM-01",
    assetName: "Phòng họp Apollo",
    bookingCode: "BK-002",
    title: "Workshop team",
    purpose: "Training",
    startTime: "2026-07-20T04:00:00.000Z",
    endTime: "2026-07-20T05:00:00.000Z",
    status: "IN_USE",
    autoRelease: false,
    checkedInAt: "2026-07-20T04:00:00.000Z",
    createdBy: "admin",
  },
];

vi.mock("../contexts/AppDataContext", () => ({
  useAppData: () => ({
    summary: {
      assets: assets.length,
      subscriptions: 0,
      vendors: 1,
      purchaseRequests: 0,
      contracts: 0,
    },
    assets,
    subscriptions: [],
    vendors: [vendor],
    requests: [],
    contracts: [],
    maintenanceRecords: [],
    transfers: [],
    utilization: null,
    employees,
    departments,
    workSites,
    projects,
    loading: false,
    error: "",
    refresh: vi.fn(),
    ensureDashboard: vi.fn(),
    ensureAssets: mocks.ensureAssets,
    ensureVendors: vi.fn(),
    ensureSubscriptions: vi.fn(),
    ensureRequests: vi.fn(),
    ensureContracts: vi.fn(),
    ensureMaintenance: vi.fn(),
    ensureTransfers: vi.fn(),
    ensureLookups: vi.fn(),
    ensureAssetDetailLookups: mocks.ensureAssetDetailLookups,
    clearError: vi.fn(),
    setError: vi.fn(),
  }),
}));

vi.mock("../services/api", () => ({
  assignAssetCatalog: mocks.assignAssetCatalog,
  cancelAssetBooking: mocks.cancelAssetBooking,
  checkAssetBookingAvailability: mocks.checkAssetBookingAvailability,
  checkInAssetBooking: mocks.checkInAssetBooking,
  checkOutAssetBooking: mocks.checkOutAssetBooking,
  commitAssetImport: mocks.commitAssetImport,
  createAssetBooking: mocks.createAssetBooking,
  deleteAsset: mocks.deleteAsset,
  loadAssetBookings: mocks.loadAssetBookings,
  loadAssetChangeHistory: mocks.loadAssetChangeHistory,
  loadAssetCategoryTree: mocks.loadAssetCategoryTree,
  loadAssetCatalogItems: mocks.loadAssetCatalogItems,
  loadAssets: mocks.loadAssets,
  issueAssetQrCodes: mocks.issueAssetQrCodes,
  updateAsset: mocks.updateAsset,
  validateAssetImport: mocks.validateAssetImport,
}));

describe("QLVT asset and booking workflow coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Object.defineProperties(document, {
      execCommand: { configurable: true, value: vi.fn(() => true) },
      queryCommandState: { configurable: true, value: vi.fn(() => false) },
      queryCommandValue: { configurable: true, value: vi.fn(() => "rgb(71, 85, 105)") },
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 0;
    });
    mocks.toastLoading.mockReturnValue("toast-id");
    mocks.ensureAssets.mockResolvedValue(undefined);
    mocks.ensureAssetDetailLookups.mockResolvedValue(undefined);
    mocks.loadAssetCategoryTree.mockResolvedValue(categoryTree);
    mocks.loadAssetCatalogItems.mockResolvedValue([
      {
        id: 1,
        itemCode: "MON-LG-27",
        name: "Màn hình LG 27 inch",
        catalogType: "ASSET",
        categoryId: 2,
        categoryCode: "LAP",
        categoryName: "Laptop",
        active: true,
      },
    ]);
    mocks.assignAssetCatalog.mockResolvedValue(undefined);
    mocks.loadAssetChangeHistory.mockResolvedValue([
      {
        id: 1,
        occurredAt: "2026-07-20T09:00:00",
        actorEmployeeId: 1,
        action: "TRANSFER_APPROVED",
        summary: "Duyệt phiếu bàn giao PBG-001",
        changedFields: {
          status: { before: "IN_STOCK", after: "ASSIGNED" },
          assignedEmployeeId: { before: null, after: 1 },
          useDate: { before: null, after: [2026, 7, 31] },
        },
      },
    ]);
    mocks.loadAssets.mockResolvedValue(assets);
    mocks.issueAssetQrCodes.mockResolvedValue([
      {
        assetId: 1,
        assetCode: "TS-001",
        assetName: "Laptop Dell Precision",
        token: "qr-token",
        publicUrl: "http://localhost:3002/asset-qr.html?token=qr-token",
      },
    ]);
    mocks.loadAssetBookings.mockResolvedValue(bookings);
    mocks.checkAssetBookingAvailability.mockResolvedValue({
      assetId: 2,
      assetCode: "ROOM-01",
      startTime: "2026-07-20T08:00",
      endTime: "2026-07-20T09:00",
      available: true,
    });
    mocks.createAssetBooking.mockResolvedValue({});
    mocks.checkInAssetBooking.mockResolvedValue({});
    mocks.checkOutAssetBooking.mockResolvedValue({});
    mocks.cancelAssetBooking.mockResolvedValue({});
    mocks.updateAsset.mockResolvedValue(laptopAsset);
    mocks.deleteAsset.mockResolvedValue(undefined);
  });

  it("renders asset filters, column config, detail edit, and bulk status update", async () => {
    const user = userEvent.setup();
    render(<AssetsPage />);

    expect(await screen.findByRole("heading", { name: "Danh sách tài sản" })).toBeVisible();
    expect(screen.getByText("Laptop Dell Precision")).toBeVisible();
    expect(screen.getByText("MON-LG-27 - Màn hình LG 27 inch")).toBeVisible();
    expect(screen.getAllByText("Phòng họp Apollo").length).toBeGreaterThan(0);

    await user.type(
      screen.getByPlaceholderText("Tìm theo mã, tên, serial, nhà cung cấp..."),
      "Dell",
    );
    expect(screen.getByRole("button", { name: "Mở thao tác cho TS-001" })).toBeInTheDocument();
    expect(screen.queryByText("Phòng họp Apollo")).not.toBeInTheDocument();
    chooseSearchableOption(screen.getByLabelText(/Trạng thái/i), "Đã cấp phát");
    chooseSearchableOption(screen.getByLabelText(/Giá trị/i), "10 - 50 triệu");

    await user.click(screen.getByRole("button", { name: "Cấu hình cột" }));
    expect(screen.getByRole("dialog", { name: "Cấu hình cột" })).toBeVisible();
    expect(screen.getByLabelText("Danh mục")).toBeChecked();
    fireEvent.click(screen.getByLabelText("Serial/MAC"));
    await user.click(screen.getByRole("button", { name: /Mặc định/i }));
    await user.click(screen.getByRole("button", { name: /Áp dụng/i }));

    await user.click(screen.getByRole("button", { name: "Mở thao tác cho TS-001" }));
    await user.click(await screen.findByRole("menuitem", { name: "Xem chi tiết" }));
    expect(await screen.findByRole("heading", { name: "Chi tiết tài sản" })).toBeVisible();
    expect(screen.getAllByText("TS-001 · Laptop Dell Precision").length).toBeGreaterThan(0);
    const detailModal = screen.getByText("Định danh và phân loại").closest(".asset-detail-modal");
    expect(detailModal).not.toBeNull();
    expect(
      within(detailModal as HTMLElement).getByRole("button", { name: "In đậm Mô tả kỹ thuật" }),
    ).toBeVisible();
    expect(
      within(detailModal as HTMLElement).getByRole("button", { name: "Đỏ - Mô tả kỹ thuật" }),
    ).toBeVisible();
    expect(detailModal?.querySelector('input[type="color"]')).not.toBeInTheDocument();
    expect(
      within(detailModal as HTMLElement).getByLabelText("Phương pháp khấu hao"),
    ).toHaveDisplayValue("Tuyến tính");
    await waitFor(() => expect(mocks.loadAssetCatalogItems).toHaveBeenCalled());
    expect(within(detailModal as HTMLElement).getByLabelText("Danh mục")).toHaveDisplayValue(
      "MON-LG-27 - Màn hình LG 27 inch",
    );
    await user.click(within(detailModal as HTMLElement).getByRole("tab", { name: /Lịch sử/i }));
    expect(await within(detailModal as HTMLElement).findByText("31/07/2026")).toBeVisible();
    expect(
      within(detailModal as HTMLElement).getByText("Chưa gán hoặc đã thu hồi về kho"),
    ).toBeVisible();
    expect(
      within(detailModal as HTMLElement).getByText("Chưa xác định ngày sử dụng"),
    ).toBeVisible();
    expect(within(detailModal as HTMLElement).getAllByText("Trong kho").length).toBeGreaterThan(0);
    expect(within(detailModal as HTMLElement).getAllByText("Đang sử dụng").length).toBeGreaterThan(
      0,
    );
    await user.click(within(detailModal as HTMLElement).getByRole("button", { name: /Quay lại/i }));
    const nameInput = within(detailModal as HTMLElement).getByDisplayValue("Laptop Dell Precision");
    fireEvent.change(nameInput, { target: { value: "Laptop Dell Precision 7780" } });
    chooseSearchableOption(
      within(detailModal as HTMLElement).getByLabelText("Năm sản xuất"),
      "2026",
    );
    const technicalDescription = within(detailModal as HTMLElement).getByRole("textbox", {
      name: "Mô tả kỹ thuật",
    });
    technicalDescription.textContent = "Core i9";
    const selectedText = document.createRange();
    selectedText.selectNodeContents(technicalDescription);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(selectedText);
    document.dispatchEvent(new Event("selectionchange"));
    fireEvent.mouseDown(
      within(detailModal as HTMLElement).getByRole("button", {
        name: "In đậm Mô tả kỹ thuật",
      }),
    );
    expect(technicalDescription.innerHTML).toBe("<strong>Core i9</strong>");
    expect(window.getSelection()?.toString()).toBe("Core i9");
    fireEvent.mouseDown(
      within(detailModal as HTMLElement).getByRole("button", {
        name: "In đậm Mô tả kỹ thuật",
      }),
    );
    expect(technicalDescription.innerHTML).toBe("Core i9");
    expect(window.getSelection()?.toString()).toBe("Core i9");
    technicalDescription.innerHTML = '<strong>Core i9</strong><img src="x" onerror="alert(1)">';
    fireEvent.input(technicalDescription);
    await user.click(
      within(detailModal as HTMLElement).getByRole("button", { name: "Lưu thay đổi" }),
    );
    await waitFor(() =>
      expect(mocks.updateAsset).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: "Laptop Dell Precision 7780",
          manufactureYear: 2026,
          technicalDescription: "<strong>Core i9</strong>",
        }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Chọn nhiều" }));
    fireEvent.click(screen.getByTitle("Chọn TS-001").querySelector("input") as HTMLInputElement);
    const bulkActionSelect = screen
      .getAllByLabelText(/Thao tác/i)
      .find((element) => element.getAttribute("role") === "combobox") as HTMLElement;
    chooseSearchableOption(bulkActionSelect, "Cập nhật trạng thái");
    chooseSearchableOption(screen.getByLabelText(/Trạng thái mới/i), "Bảo trì");
    await user.click(screen.getByRole("button", { name: "Lưu trạng thái" }));
    await waitFor(() =>
      expect(mocks.updateAsset).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: "MAINTENANCE" }),
      ),
    );

    fireEvent.click(screen.getByTitle("Chọn TS-001").querySelector("input") as HTMLInputElement);
    chooseSearchableOption(bulkActionSelect, "Gán danh mục");
    chooseSearchableOption(screen.getByLabelText("Danh mục"), "MON-LG-27 - Màn hình LG 27 inch");
    await user.click(screen.getByRole("button", { name: "Gán danh mục" }));
    await waitFor(() =>
      expect(mocks.assignAssetCatalog).toHaveBeenCalledWith({ assetIds: [1], catalogItemId: 1 }),
    );
  });

  it("deletes selected assets from the selection workspace", async () => {
    const user = userEvent.setup();
    render(<AssetsPage />);
    await screen.findByRole("heading", { name: "Danh sách tài sản" });
    await user.click(screen.getByRole("button", { name: "Chọn nhiều" }));

    fireEvent.click(screen.getByTitle("Chọn TS-001").querySelector("input") as HTMLInputElement);
    const workspace = screen.getByText("1 tài sản đã chọn").closest(".asset-selection-workspace");
    await user.click(within(workspace as HTMLElement).getByRole("button", { name: "Xóa" }));
    await waitFor(() => expect(mocks.deleteAsset).toHaveBeenCalledWith(1));
  });

  it("reports bulk update and delete failures", async () => {
    const user = userEvent.setup();
    mocks.updateAsset.mockRejectedValueOnce(new Error("update failed"));
    mocks.deleteAsset.mockRejectedValueOnce(new Error("delete failed"));
    render(<AssetsPage />);
    await screen.findByRole("heading", { name: "Danh sách tài sản" });
    await user.click(screen.getByRole("button", { name: "Chọn nhiều" }));
    fireEvent.click(screen.getByTitle("Chọn TS-001").querySelector("input") as HTMLInputElement);

    const actionSelect = screen
      .getAllByLabelText(/Thao tác/i)
      .find((element) => element.getAttribute("role") === "combobox") as HTMLElement;
    chooseSearchableOption(actionSelect, "Cập nhật trạng thái");
    await user.click(screen.getByRole("button", { name: "Lưu trạng thái" }));
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith("Không cập nhật được 1 tài sản đã chọn."),
    );

    await user.click(screen.getByRole("button", { name: "Xóa" }));
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith("Không xóa được một số tài sản đã chọn."),
    );
  });

  it("opens asset QR and resets filters without clearing search", async () => {
    const user = userEvent.setup();
    render(<AssetsPage />);
    await screen.findByRole("heading", { name: "Danh sách tài sản" });

    await user.click(screen.getByRole("button", { name: "Mở thao tác cho TS-001" }));
    await user.click(await screen.findByRole("menuitem", { name: "Xem QR" }));
    expect(await screen.findByRole("heading", { name: "Mã QR tài sản" })).toBeVisible();
    expect(await screen.findByText("Quét mã để xem thông tin của tài sản này.")).toBeVisible();
    expect(mocks.issueAssetQrCodes).toHaveBeenCalledWith([1]);
    await user.click(screen.getByRole("button", { name: "Đóng" }));

    await user.type(
      screen.getByPlaceholderText("Tìm theo mã, tên, serial, nhà cung cấp..."),
      "Dell",
    );
    chooseSearchableOption(screen.getByLabelText(/Trạng thái/i), "Đã cấp phát");
    chooseSearchableOption(screen.getByLabelText(/Giá trị/i), "10 - 50 triệu");
    await user.click(screen.getByRole("button", { name: "Tất cả" }));
    expect(screen.getByPlaceholderText("Tìm theo mã, tên, serial, nhà cung cấp...")).toHaveValue(
      "Dell",
    );
    expect(screen.getByLabelText(/Trạng thái/i)).toHaveValue("Tất cả trạng thái");
    expect(screen.getByLabelText(/Giá trị/i)).toHaveValue("Tất cả giá trị");
  });

  it("renders booking form, calendar, detail modal, and check-in action", async () => {
    const user = userEvent.setup();
    render(<BookingPage />);

    expect(await screen.findByRole("heading", { name: "Đặt lịch phòng họp" })).toBeVisible();
    expect((await screen.findAllByText("Họp điều phối")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Workshop team").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/Phòng họp \/ tài sản/i), {
      target: { value: "ROOM-01" },
    });
    await user.type(screen.getByLabelText(/^Tiêu đề$/i), "Demo phối hợp");
    fireEvent.change(screen.getByLabelText(/^Bắt đầu$/i), {
      target: { value: "2026-07-20T08:00" },
    });
    fireEvent.change(screen.getByLabelText(/^Kết thúc$/i), {
      target: { value: "2026-07-20T09:00" },
    });
    await user.type(screen.getByLabelText(/^Mục đích$/i), "Demo mô hình BIM");
    await user.click(screen.getByRole("button", { name: /Kiểm tra lịch/i }));
    await waitFor(() => expect(mocks.checkAssetBookingAvailability).toHaveBeenCalled());
    expect(screen.getByText("Khung giờ khả dụng")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Xác nhận đặt phòng/i }));
    await waitFor(() =>
      expect(mocks.createAssetBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          assetCode: "ROOM-01",
          title: "Demo phối hợp",
          purpose: "Demo mô hình BIM",
          createdBy: "admin",
        }),
      ),
    );

    fireEvent.change(screen.getByLabelText(/Chế độ xem/i), { target: { value: "month" } });
    expect(screen.getAllByText("Họp điều phối").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /Trước/i }));
    await user.click(screen.getByRole("button", { name: /Sau/i }));
    await user.click(screen.getByRole("button", { name: "Hôm nay" }));

    await user.click(screen.getByRole("button", { name: "Mở thao tác cho BK-001" }));
    await user.click(await screen.findByRole("menuitem", { name: "Xem chi tiết" }));
    expect(await screen.findByRole("heading", { name: "Họp điều phối" })).toBeVisible();
    expect(screen.getAllByText("BK-001").length).toBeGreaterThan(0);
    fireEvent.mouseDown(
      screen.getByText("Phòng ban / site / dự án").closest(".modal-backdrop") as HTMLElement,
    );

    await user.click(screen.getByRole("button", { name: "Mở thao tác cho BK-001" }));
    await user.click(await screen.findByRole("menuitem", { name: "Nhận phòng" }));
    expect(await screen.findByRole("heading", { name: "Xác nhận nhận phòng" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));
    await waitFor(() => expect(mocks.checkInAssetBooking).toHaveBeenCalledWith(1));
  });

  it("checks out, cancels, filters, and configures booking columns", async () => {
    const user = userEvent.setup();
    render(<BookingPage />);
    await screen.findAllByText("Workshop team");

    fireEvent.change(screen.getAllByLabelText(/Trạng thái/i).at(-1) as HTMLSelectElement, {
      target: { value: "IN_USE" },
    });
    fireEvent.change(screen.getByLabelText(/Từ thời điểm/i), {
      target: { value: "2026-07-20T00:00" },
    });
    fireEvent.change(screen.getByLabelText(/Đến thời điểm/i), {
      target: { value: "2026-07-21T00:00" },
    });

    await user.click(screen.getByRole("button", { name: "Cấu hình cột" }));
    expect(screen.getByRole("menu")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Mặc định/i }));
    await user.click(screen.getByRole("button", { name: /Áp dụng/i }));

    await user.click(screen.getByRole("button", { name: "Mở thao tác cho BK-002" }));
    await user.click(await screen.findByRole("menuitem", { name: "Trả phòng" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));
    await waitFor(() =>
      expect(mocks.checkOutAssetBooking).toHaveBeenCalledWith(2, expect.anything()),
    );

    fireEvent.change(screen.getAllByLabelText(/Trạng thái/i).at(-1) as HTMLSelectElement, {
      target: { value: "" },
    });
    await user.click(screen.getByRole("button", { name: "Mở thao tác cho BK-001" }));
    await user.click(await screen.findByRole("menuitem", { name: "Hủy lịch" }));
    await user.type(screen.getByLabelText("Lý do hủy"), "Đổi lịch họp");
    await user.click(screen.getByRole("button", { name: "Xác nhận" }));
    await waitFor(() =>
      expect(mocks.cancelAssetBooking).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          cancelReason: "Đổi lịch họp",
        }),
      ),
    );
  });

  it("parses, validates, imports, and exports an asset workbook", async () => {
    const user = userEvent.setup();
    const XLSX = await import("xlsx");
    const keys = [
      "assets.asset_code",
      "assets.name",
      "assets.asset_class",
      "fixed_asset_type",
      "asset_categories.code",
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
    const worksheet = XLSX.utils.aoa_to_sheet([
      keys,
      keys.map(() => "Mô tả"),
      [
        "TS-NEW",
        "Máy trạm BIM",
        "Tài sản cố định",
        "TANGIBLE",
        "LAP (Laptop)",
        "BIM",
        "Văn phòng HCM",
        "CAT-1",
        "STRAIGHT_LINE",
        "SN-NEW",
        new Date("2026-07-01"),
        new Date("2026-07-02"),
        60,
        40_000_000,
        35_000_000,
        "Trong kho",
        "VN",
        2026,
        2026,
        "Máy dựng hình",
      ],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HoSoTaiSan_Import");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const validation = {
      uploadStatus: "VALID",
      totalRows: 1,
      validRows: 1,
      errorRows: 0,
      warningRows: 0,
      rows: [
        {
          rowNumber: 3,
          status: "VALID",
          assetCode: "TS-NEW",
          name: "Máy trạm BIM",
          categoryCode: "LAP",
          action: "CREATE",
          errors: [],
          warnings: [{ field: "serialNumber", code: "CHECK", message: "Kiểm tra serial" }],
        },
      ],
    };
    mocks.validateAssetImport.mockResolvedValueOnce(validation);
    mocks.commitAssetImport.mockResolvedValueOnce(validation);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:result"),
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<AssetsPage />);
    await screen.findByRole("heading", { name: "Danh sách tài sản" });

    await user.click(screen.getByRole("button", { name: /Tải mẫu Excel/i }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled(), { timeout: 5000 });

    await user.click(screen.getByRole("button", { name: /Nhập tài sản/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File([bytes], "assets.xlsx"));
    expect(await screen.findByText("Máy trạm BIM")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu" }));
    await waitFor(() => expect(mocks.validateAssetImport).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(mocks.commitAssetImport).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: /Tải kết quả/i }));

    const warningSummary = screen.getByText(/Kiểm tra serial/i);
    fireEvent.mouseEnter(warningSummary);
    expect(document.querySelector(".asset-import-floating-tooltip")).toHaveTextContent(
      "- Kiểm tra serial",
    );
    fireEvent.mouseLeave(warningSummary);

    await user.click(screen.getByRole("button", { name: "Hủy" }));
    expect(screen.getByText("Hủy phiên nhập tài sản?")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Tiếp tục nhập" }));
    expect(screen.queryByText("Hủy phiên nhập tài sản?")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hủy" }));
    await user.click(screen.getByRole("button", { name: "Hủy phiên nhập" }));
    expect(
      screen.queryByRole("heading", { name: "Tải danh sách tài sản" }),
    ).not.toBeInTheDocument();
  });
});
