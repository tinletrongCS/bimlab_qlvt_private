import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  let requestHandler: ((config: any) => any) | null = null;
  let responseErrorHandler: ((error: any) => Promise<never>) | null = null;
  const api = {
    interceptors: {
      request: {
        use: vi.fn((handler) => {
          requestHandler = handler;
        }),
      },
      response: {
        use: vi.fn((_ok, handler) => {
          responseErrorHandler = handler;
        }),
      },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
  return {
    api,
    token: vi.fn(),
    requestHandler: () => requestHandler,
    responseErrorHandler: () => responseErrorHandler,
  };
});

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mocks.api),
  },
}));

vi.mock("../auth/oidc", () => ({
  getAccessToken: mocks.token,
}));

describe("asset api client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.token.mockReturnValue(null);
    mocks.api.get.mockReset();
    mocks.api.post.mockReset();
  });

  it("attaches bearer token when present", async () => {
    const { api } = await import("./api");
    mocks.token.mockReturnValue("access-token");
    const headers = { set: vi.fn() };

    const result = mocks.requestHandler()?.({ headers });

    expect(api).toBe(mocks.api);
    expect(result).toEqual({ headers });
    expect(headers.set).toHaveBeenCalledWith("Authorization", "Bearer access-token");
  });

  it("maps current user response and hides failures", async () => {
    const { loadCurrentUser } = await import("./api");
    mocks.api.get.mockResolvedValueOnce({
      data: {
        username: "alice",
        role: "ASSET_ADMIN",
        employeeId: 7,
        permissions: ["asset.read"],
      },
    });

    await expect(loadCurrentUser()).resolves.toEqual({
      username: "alice",
      role: "ASSET_ADMIN",
      id: 7,
      permissions: ["asset.read"],
    });
    expect(mocks.api.get).toHaveBeenCalledWith("/asset/me");

    mocks.api.get.mockRejectedValueOnce(new Error("down"));
    await expect(loadCurrentUser()).resolves.toBeNull();
  });

  it("posts import validate and commit payloads to stable endpoints", async () => {
    const { validateAssetImport, commitAssetImport } = await import("./api");
    mocks.api.post
      .mockResolvedValueOnce({ data: { uploadStatus: "VALID" } })
      .mockResolvedValueOnce({ data: { uploadStatus: "IMPORTED" } });
    const rows = [{ rowNumber: 1, name: "Laptop" }] as any[];

    await expect(validateAssetImport(rows)).resolves.toEqual({ uploadStatus: "VALID" });
    await expect(commitAssetImport({ importMode: "PARTIAL", rows } as any)).resolves.toEqual({
      uploadStatus: "IMPORTED",
    });

    expect(mocks.api.post).toHaveBeenNthCalledWith(1, "/asset/assets/import/validate", { rows });
    expect(mocks.api.post).toHaveBeenNthCalledWith(2, "/asset/assets/import", {
      importMode: "PARTIAL",
      rows,
    });
  });

  it("rejects 410 responses through the response interceptor", async () => {
    await import("./api");
    window.history.pushState({}, "", "/login");
    const error = { response: { status: 410 } };

    await expect(mocks.responseErrorHandler()?.(error)).rejects.toBe(error);
  });

  it("covers CRUD and workflow endpoint wrappers", async () => {
    const client = await import("./api");
    for (const method of ["get", "post", "put", "patch"] as const) {
      mocks.api[method].mockResolvedValue({ data: { ok: method } });
    }
    mocks.api.delete.mockResolvedValue({});
    const payload = { name: "x" } as any;

    await Promise.all([
      client.loadDashboard(),
      client.loadUtilization(),
      client.loadVendors(),
      client.createVendor(payload),
      client.updateVendor(1, payload),
      client.deleteVendor(1),
      client.loadAssets(),
      client.createAsset(payload),
      client.updateAsset(1, payload),
      client.deleteAsset(1),
      client.loadAssetCategories(),
      client.loadAssetCategoryTree(),
      client.createAssetCategory(payload),
      client.updateAssetCategory(1, payload),
      client.deleteAssetCategory(1),
      client.validateAssetCategoryImport([]),
      client.commitAssetCategoryImport({ rows: [] } as any),
      client.loadDepreciation(1),
      client.disposeAsset(1, payload),
      client.loadSubscriptions(),
      client.createSubscription(payload),
      client.updateSubscription(1, payload),
      client.deleteSubscription(1),
      client.loadPurchaseRequests(),
      client.createPurchaseRequest(payload),
      client.updatePurchaseRequest(1, payload),
      client.updatePurchaseRequestStatus(1, "APPROVED"),
      client.deletePurchaseRequest(1),
      client.loadContracts(),
      client.createContract(payload),
      client.updateContract(1, payload),
      client.updateContractStatus(1, "ACTIVE"),
      client.deleteContract(1),
      client.loadMaintenanceRecords(),
      client.createMaintenanceRecord(payload),
      client.updateMaintenanceRecord(1, payload),
      client.deleteMaintenanceRecord(1),
      client.loadWarrantyExpiring(),
      client.loadWarrantyExpiring(7),
      client.loadTransfers(),
      client.createTransfer(payload),
      client.deleteTransfer(1),
      client.loadAssetBookings(),
      client.loadAssetBookings({ assetId: 1, status: "CONFIRMED" }),
      client.checkAssetBookingAvailability({ assetCode: "TS-1", startTime: "a", endTime: "b" }),
      client.createAssetBooking(payload),
      client.checkInAssetBooking(1),
      client.checkOutAssetBooking(1, payload),
      client.cancelAssetBooking(1, payload),
      client.loadEmployees(),
      client.loadDepartments(),
      client.loadWorkSites(),
      client.loadProjects(),
    ]);

    expect(mocks.api.get).toHaveBeenCalledWith("/asset/maintenance/warranty-expiring", {
      params: { days: 30 },
    });
    expect(mocks.api.post).toHaveBeenCalledWith("/asset/bookings/1/check-in");
    expect(mocks.api.get).toHaveBeenCalledWith("/asset/bookings/availability", {
      params: { assetCode: "TS-1", startTime: "a", endTime: "b" },
    });
  });
});
