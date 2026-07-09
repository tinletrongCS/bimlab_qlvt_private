import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetsPage } from "../pages/AssetsPage";
import { BookingPage } from "../pages/BookingPage";

const mocks = vi.hoisted(() => ({
  cancelAssetBooking: vi.fn(),
  checkAssetBookingAvailability: vi.fn(),
  checkInAssetBooking: vi.fn(),
  checkOutAssetBooking: vi.fn(),
  commitAssetImport: vi.fn(),
  deleteAsset: vi.fn(),
  ensureAssetDetailLookups: vi.fn(),
  ensureAssets: vi.fn(),
  loadAssetBookings: vi.fn(),
  loadAssetCategoryTree: vi.fn(),
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
  cancelAssetBooking: mocks.cancelAssetBooking,
  checkAssetBookingAvailability: mocks.checkAssetBookingAvailability,
  checkInAssetBooking: mocks.checkInAssetBooking,
  checkOutAssetBooking: mocks.checkOutAssetBooking,
  commitAssetImport: mocks.commitAssetImport,
  createAssetBooking: mocks.createAssetBooking,
  deleteAsset: mocks.deleteAsset,
  loadAssetBookings: mocks.loadAssetBookings,
  loadAssetCategoryTree: mocks.loadAssetCategoryTree,
  loadAssets: mocks.loadAssets,
  updateAsset: mocks.updateAsset,
  validateAssetImport: mocks.validateAssetImport,
}));

describe("QLVT asset and booking workflow coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 0;
    });
    mocks.toastLoading.mockReturnValue("toast-id");
    mocks.ensureAssets.mockResolvedValue(undefined);
    mocks.ensureAssetDetailLookups.mockResolvedValue(undefined);
    mocks.loadAssetCategoryTree.mockResolvedValue(categoryTree);
    mocks.loadAssets.mockResolvedValue(assets);
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
    expect(screen.getAllByText("Phòng họp Apollo").length).toBeGreaterThan(0);

    await user.type(
      screen.getByPlaceholderText("Tìm theo mã, tên, serial, nhà cung cấp..."),
      "Dell",
    );
    // Sau khi lọc "Dell": tài sản Dell còn, Apollo biến mất (UI mới render mã gộp nên assert
    // theo tên tài sản — node <strong> đơn — thay vì mã bị tách node).
    // Sau khi lọc "Dell": hàng Dell còn (kiểm qua nút thao tác aria-label ổn định — UI mới
    // render tên/mã tách node), Apollo biến mất.
    expect(screen.getByRole("button", { name: "Mở thao tác cho TS-001" })).toBeInTheDocument();
    expect(screen.queryByText("Phòng họp Apollo")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Trạng thái/i), { target: { value: "ASSIGNED" } });
    fireEvent.change(screen.getByLabelText(/Giá trị/i), { target: { value: "FROM_10M_TO_50M" } });

    await user.click(screen.getByRole("button", { name: "Cấu hình cột" }));
    expect(screen.getByRole("dialog", { name: "Cấu hình cột" })).toBeVisible();
    fireEvent.click(screen.getByLabelText("Serial/MAC"));
    await user.click(screen.getByRole("button", { name: /Áp dụng/i }));

    await user.click(screen.getByRole("button", { name: "Mở thao tác cho TS-001" }));
    await user.click(await screen.findByRole("menuitem", { name: "Xem chi tiết" }));
    expect(await screen.findByRole("heading", { name: "Chi tiết tài sản" })).toBeVisible();
    expect(screen.getAllByText("TS-001 · Laptop Dell Precision").length).toBeGreaterThan(0);
    const detailModal = screen.getByText("Định danh và phân loại").closest(".asset-detail-modal");
    expect(detailModal).not.toBeNull();
    const nameInput = within(detailModal as HTMLElement).getByDisplayValue("Laptop Dell Precision");
    fireEvent.change(nameInput, { target: { value: "Laptop Dell Precision 7780" } });
    await user.click(
      within(detailModal as HTMLElement).getByRole("button", { name: "Lưu thay đổi" }),
    );
    await waitFor(() =>
      expect(mocks.updateAsset).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: "Laptop Dell Precision 7780" }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "Chọn nhiều" }));
    fireEvent.click(screen.getByTitle("Chọn TS-001").querySelector("input") as HTMLInputElement);
    const bulkActionSelect = screen
      .getAllByLabelText(/Thao tác/i)
      .find((element) => element.tagName === "SELECT") as HTMLSelectElement;
    fireEvent.change(bulkActionSelect, { target: { value: "status" } });
    fireEvent.change(screen.getByLabelText(/Trạng thái mới/i), {
      target: { value: "MAINTENANCE" },
    });
    await user.click(screen.getByRole("button", { name: "Lưu trạng thái" }));
    await waitFor(() =>
      expect(mocks.updateAsset).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: "MAINTENANCE" }),
      ),
    );
  });

  it("renders booking form, calendar, detail modal, and check-in action", async () => {
    const user = userEvent.setup();
    render(<BookingPage />);

    expect(await screen.findByRole("heading", { name: "Đặt lịch phòng họp" })).toBeVisible();
    expect(await screen.findByText("Họp điều phối")).toBeVisible();
    expect(screen.getByText("Workshop team")).toBeVisible();

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
});
