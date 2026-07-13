import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import * as api from "../services/api";

const categoryExcelMocks = vi.hoisted(() => ({
  download: vi.fn().mockResolvedValue(undefined),
  parse: vi.fn().mockResolvedValue([
    { rowNumber: 2, group: "Danh mục", code: "TB", name: "Thiết bị", parentCode: "" },
    { rowNumber: 3, group: "Danh mục", code: "MON", name: "Màn hình", parentCode: "TB" },
  ]),
}));

vi.mock("../lib/categoryExcel", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/categoryExcel")>()),
  downloadCategoryImportTemplate: categoryExcelMocks.download,
  parseCategoryReferenceSheet: categoryExcelMocks.parse,
}));

const { asset, categories, categoryTree, employee, permissions, vendor } = vi.hoisted(() => {
  const permissions = [
    "asset_access",
    "asset_manage",
    "vendor_manage",
    "subscription_manage",
    "purchase_request_create",
    "purchase_request_approve",
    "contract_manage",
    "maintenance_manage",
    "asset_report_view",
  ] as const;

  const vendor = {
    id: 1,
    name: "Công ty Thiết bị BIM",
    taxCode: "0101001001",
    contactName: "Nguyễn Vendor",
    email: "vendor@bimlab.test",
    phone: "0900000001",
    status: "ACTIVE",
  };

  const asset = {
    id: 1,
    assetCode: "TS-001",
    name: "Laptop Dell Precision",
    category: "Thiết bị",
    serialNumber: "SN001",
    source: "PURCHASE",
    vendor,
    assignedEmployeeId: 1,
    departmentId: 1,
    siteId: 1,
    projectId: 1,
    purchaseCost: 35_000_000,
    originalCost: 35_000_000,
    bookValue: 30_000_000,
    residualValue: 5_000_000,
    status: "ASSIGNED",
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
  ];

  const categoryTree = [
    {
      ...categories[0],
      children: [{ ...categories[1], children: [] }],
    },
  ];

  const employee = {
    id: 1,
    fullName: "Nguyễn Văn A",
    employeeCode: "E001",
    departmentName: "BIM",
  };

  return { asset, categories, categoryTree, employee, permissions, vendor };
});

vi.mock("../auth/oidc", () => ({
  getAccessToken: () => "test-token",
  handleOidcCallback: vi.fn().mockResolvedValue(true),
  isOidcCallback: vi.fn(() => false),
  keycloakLogin: vi.fn().mockResolvedValue(undefined),
  keycloakLogout: vi.fn().mockResolvedValue(undefined),
  onSessionLost: vi.fn(),
  trySilentLogin: vi.fn().mockResolvedValue(true),
}));

vi.mock("../services/api", () => ({
  loadCurrentUser: vi.fn().mockResolvedValue({
    id: 1,
    username: "admin",
    role: "ADMIN",
    fullName: "Admin BIMLab",
    permissions: [...permissions],
  }),
  loadDashboard: vi.fn().mockResolvedValue({
    assets: 1,
    subscriptions: 1,
    vendors: 1,
    purchaseRequests: 1,
    contracts: 1,
  }),
  loadUtilization: vi.fn().mockResolvedValue({
    totalAssets: 1,
    assignedAssets: 1,
    idleAssets: 0,
    maintenanceAssets: 0,
    disposedAssets: 0,
    utilizationRate: 100,
    totalPurchaseValue: 35_000_000,
    totalIdleValue: 0,
    byStatus: { ASSIGNED: 1 },
    byCategory: { "Thiết bị": 1 },
  }),
  loadVendors: vi.fn().mockResolvedValue([vendor]),
  loadAssets: vi.fn().mockResolvedValue([asset]),
  loadSubscriptions: vi.fn().mockResolvedValue([
    {
      id: 1,
      softwareName: "Autodesk BIM",
      planName: "Team",
      vendor,
      totalSeats: 10,
      usedSeats: 4,
      cost: 12_000_000,
      renewalDate: "2026-12-31",
      status: "ACTIVE",
    },
  ]),
  loadPurchaseRequests: vi.fn().mockResolvedValue([
    {
      id: 1,
      requestType: "ASSET",
      title: "Mua laptop dựng hình",
      estimatedCost: 35_000_000,
      neededDate: "2026-08-01",
      status: "PENDING",
    },
  ]),
  loadContracts: vi.fn().mockResolvedValue([
    {
      id: 1,
      contractNumber: "HD-001",
      title: "Hợp đồng laptop",
      vendor,
      signDate: "2026-07-01",
      effectiveTo: "2027-07-01",
      contractValue: 35_000_000,
      status: "ACTIVE",
    },
  ]),
  loadMaintenanceRecords: vi.fn().mockResolvedValue([
    {
      id: 1,
      asset,
      maintenanceType: "Định kỳ",
      maintenanceDate: "2026-07-15",
      cost: 500_000,
      vendor,
      nextMaintenanceDate: "2026-10-15",
      status: "SCHEDULED",
    },
  ]),
  loadTransfers: vi.fn().mockResolvedValue([
    {
      id: 1,
      asset,
      transferType: "ASSIGN",
      toEmployeeId: 1,
      transferDate: "2026-07-20",
      reason: "Bàn giao dự án",
      performedBy: "Admin BIMLab",
    },
  ]),
  loadEmployees: vi.fn().mockResolvedValue([employee]),
  loadDepartments: vi.fn().mockResolvedValue([{ id: 1, name: "BIM" }]),
  loadWorkSites: vi.fn().mockResolvedValue([{ id: 1, name: "Văn phòng", active: true }]),
  loadProjects: vi.fn().mockResolvedValue([{ id: 1, name: "Dự án Alpha", code: "ALPHA" }]),
  loadAssetCategories: vi.fn().mockResolvedValue(categories),
  loadAssetCategoryTree: vi.fn().mockResolvedValue(categoryTree),
  loadAssetBookings: vi.fn().mockResolvedValue([
    {
      id: 1,
      assetId: 1,
      assetCode: "ROOM-01",
      assetName: "Phòng họp Apollo",
      bookingCode: "BK-001",
      title: "Họp điều phối",
      startTime: "2026-07-20T02:00:00.000Z",
      endTime: "2026-07-20T03:00:00.000Z",
      status: "CONFIRMED",
      autoRelease: true,
    },
  ]),
  checkAssetBookingAvailability: vi.fn().mockResolvedValue({ available: true }),
  createAssetBooking: vi.fn().mockResolvedValue({}),
  checkInAssetBooking: vi.fn().mockResolvedValue({}),
  checkOutAssetBooking: vi.fn().mockResolvedValue({}),
  cancelAssetBooking: vi.fn().mockResolvedValue({}),
  createVendor: vi.fn().mockResolvedValue(vendor),
  updateVendor: vi.fn().mockResolvedValue(vendor),
  deleteVendor: vi.fn().mockResolvedValue(undefined),
  createAsset: vi.fn().mockResolvedValue(asset),
  updateAsset: vi.fn().mockResolvedValue(asset),
  deleteAsset: vi.fn().mockResolvedValue(undefined),
  validateAssetImport: vi.fn().mockResolvedValue({ rows: [] }),
  commitAssetImport: vi.fn().mockResolvedValue({ rows: [] }),
  createAssetCategory: vi.fn().mockResolvedValue(categories[0]),
  updateAssetCategory: vi.fn().mockResolvedValue(categories[0]),
  deleteAssetCategory: vi.fn().mockResolvedValue(undefined),
  validateAssetCategoryImport: vi.fn().mockResolvedValue({ rows: [] }),
  commitAssetCategoryImport: vi.fn().mockResolvedValue({ rows: [] }),
  loadDepreciation: vi.fn().mockResolvedValue({
    assetId: 1,
    method: "STRAIGHT_LINE",
    purchaseCost: 35_000_000,
    residualValue: 5_000_000,
    annualDepreciation: 6_000_000,
    accumulatedDepreciation: 5_000_000,
    bookValue: 30_000_000,
    yearsElapsed: 1,
  }),
  disposeAsset: vi.fn().mockResolvedValue(asset),
  createSubscription: vi.fn().mockResolvedValue({}),
  updateSubscription: vi.fn().mockResolvedValue({}),
  deleteSubscription: vi.fn().mockResolvedValue(undefined),
  createPurchaseRequest: vi.fn().mockResolvedValue({}),
  updatePurchaseRequest: vi.fn().mockResolvedValue({}),
  updatePurchaseRequestStatus: vi.fn().mockResolvedValue({}),
  deletePurchaseRequest: vi.fn().mockResolvedValue(undefined),
  createContract: vi.fn().mockResolvedValue({}),
  updateContract: vi.fn().mockResolvedValue({}),
  updateContractStatus: vi.fn().mockResolvedValue({}),
  deleteContract: vi.fn().mockResolvedValue(undefined),
  createMaintenanceRecord: vi.fn().mockResolvedValue({}),
  updateMaintenanceRecord: vi.fn().mockResolvedValue({}),
  deleteMaintenanceRecord: vi.fn().mockResolvedValue(undefined),
  loadWarrantyExpiring: vi.fn().mockResolvedValue([]),
  createTransfer: vi.fn().mockResolvedValue({}),
  deleteTransfer: vi.fn().mockResolvedValue(undefined),
}));

async function renderRoute(path: string, text: string | RegExp) {
  window.history.pushState({}, "", path);
  render(<App />);
  expect(await screen.findAllByText(text)).not.toHaveLength(0);
}

describe("QLVT pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it.each([
    ["/dashboard", "Hệ thống quản lý tài sản"],
    ["/vendors", "Công ty Thiết bị BIM"],
    ["/subscriptions", "Autodesk BIM"],
    ["/requests", "Mua laptop dựng hình"],
    ["/contracts", "HD-001"],
    ["/maintenance", /TS-001 · Laptop Dell Precision/],
    ["/transfers", "Bàn giao dự án"],
    ["/asset-categories", "Thiết bị"],
    ["/help", "Hướng dẫn sử dụng"],
  ])("renders %s", async (path, text) => {
    await renderRoute(path, text);
  });

  it("lists upcoming bookings on the dashboard", async () => {
    await renderRoute("/dashboard", "Hệ thống quản lý tài sản");
    expect(await screen.findByText("Họp điều phối")).toBeVisible();
    expect(screen.getByText(/20-07 · /)).toBeVisible();
  });

  it("creates and deletes a vendor from the vendors route", async () => {
    const user = userEvent.setup();
    await renderRoute("/vendors", "Công ty Thiết bị BIM");

    await user.click(screen.getByRole("button", { name: /Thêm mới/i }));
    expect(await screen.findByRole("heading", { name: "Thêm nhà cung cấp" })).toBeVisible();
    await user.clear(screen.getByLabelText(/Tên nhà cung cấp/i));
    await user.type(screen.getByLabelText(/Tên nhà cung cấp/i), "Công ty Máy trạm BIM");
    await user.type(screen.getByLabelText(/Email/i), "workstation@bimlab.test");
    await user.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(api.createVendor).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Công ty Máy trạm BIM",
          email: "workstation@bimlab.test",
        }),
      ),
    );

    await user.click(screen.getByRole("button", { name: /Xóa/i }));
    await waitFor(() => expect(api.deleteVendor).toHaveBeenCalledWith(1));
  });

  it("approves a purchase request from the requests route", async () => {
    const user = userEvent.setup();
    await renderRoute("/requests", "Mua laptop dựng hình");

    await user.click(screen.getByRole("button", { name: "Duyệt" }));

    await waitFor(() =>
      expect(api.updatePurchaseRequestStatus).toHaveBeenCalledWith(1, "APPROVED"),
    );
  });

  it("updates a contract from the contracts route", async () => {
    const user = userEvent.setup();
    await renderRoute("/contracts", "HD-001");

    await user.click(screen.getByRole("button", { name: /Sửa/i }));
    const title = await screen.findByRole("heading", { name: "Cập nhật hợp đồng" });
    const modal = title.closest("form") as HTMLFormElement;
    const titleInput = within(modal).getByDisplayValue("Hợp đồng laptop");
    await user.clear(titleInput);
    await user.type(titleInput, "Hợp đồng laptop điều chỉnh");
    fireEvent.change(within(modal).getByLabelText(/Trạng thái/i), { target: { value: "ACTIVE" } });
    await user.click(within(modal).getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(api.updateContract).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: "Hợp đồng laptop điều chỉnh",
          status: "ACTIVE",
        }),
      ),
    );
  });

  it("manages category hierarchy and completes an import", async () => {
    const user = userEvent.setup();
    vi.mocked(api.validateAssetCategoryImport).mockResolvedValueOnce({
      uploadStatus: "VALID",
      totalRows: 2,
      validRows: 2,
      errorRows: 0,
      warningRows: 1,
      rows: [
        {
          rowNumber: 2,
          status: "VALID",
          code: "TB",
          name: "Thiết bị",
          parentCode: "",
          action: "UPDATE",
          errors: [],
          warnings: [],
        },
        {
          rowNumber: 3,
          status: "VALID",
          code: "MON",
          name: "Màn hình",
          parentCode: "TB",
          action: "CREATE",
          errors: [],
          warnings: [{ field: "code", code: "CHECK", message: "Kiểm tra mã" }],
        },
      ],
    } as any);
    vi.mocked(api.commitAssetCategoryImport).mockResolvedValueOnce({
      uploadStatus: "SUCCESS",
      importedRows: 1,
      updatedRows: 0,
      skippedRows: 0,
      errorRows: 0,
      rows: [],
    } as any);
    await renderRoute("/asset-categories", "Thiết bị");

    await user.type(screen.getByLabelText("Tìm danh mục"), "Laptop");
    await user.click(screen.getByRole("button", { name: "Xóa nội dung tìm kiếm" }));
    fireEvent.change(screen.getByLabelText("Loại danh mục"), { target: { value: "FIXED_ASSET" } });
    fireEvent.change(screen.getByLabelText("Trạng thái"), { target: { value: "ACTIVE" } });

    await user.clear(screen.getByLabelText("Tên danh mục"));
    await user.type(screen.getByLabelText("Tên danh mục"), "Màn hình");
    await user.type(screen.getByLabelText("Mã danh mục"), "MON");
    await user.type(screen.getByLabelText("Mô tả"), "Màn hình văn phòng");
    await user.click(screen.getByRole("button", { name: "Tạo danh mục" }));
    await waitFor(() => expect(api.createAssetCategory).toHaveBeenCalled());

    await user.click(screen.getAllByTitle("Thêm danh mục con")[0]);
    expect(screen.getByText("Tạo danh mục con của")).toBeVisible();
    await user.type(screen.getByLabelText("Tên danh mục"), "Máy trạm");
    await user.type(screen.getByLabelText("Mã danh mục"), "WS");

    await user.click(screen.getAllByTitle("Xóa")[0]);
    await waitFor(() => expect(api.deleteAssetCategory).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: /Tải danh mục/i }));
    await waitFor(() => expect(categoryExcelMocks.download).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: /Import danh mục/i }));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, new File(["xlsx"], "categories.xlsx"));
    await waitFor(() => expect(categoryExcelMocks.parse).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Kiểm tra dữ liệu" }));
    await waitFor(() => expect(api.validateAssetCategoryImport).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: /Cảnh báo/i }));
    await user.click(screen.getByRole("button", { name: /Lỗi/i }));
    await user.click(screen.getByRole("button", { name: /Hợp lệ/i }));
    await user.click(screen.getByRole("button", { name: /Tất cả/i }));
    await user.click(screen.getByRole("button", { name: "Phân cấp cha con" }));
    await user.click(screen.getAllByRole("button", { name: /Thiết bị/ }).at(-1) as HTMLElement);
    await user.click(screen.getByRole("button", { name: "Danh sách dòng" }));
    await user.click(screen.getByRole("button", { name: "Xác nhận nhập" }));
    await waitFor(() => expect(api.commitAssetCategoryImport).toHaveBeenCalled());
  });
});
