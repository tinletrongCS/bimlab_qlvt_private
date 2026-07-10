import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionsProvider, useActions } from "./ActionsContext";
import * as api from "../services/api";

const app = vi.hoisted(() => ({ refresh: vi.fn().mockResolvedValue(undefined), setError: vi.fn() }));

vi.mock("./AppDataContext", () => ({ useAppData: () => app }));
vi.mock("../services/api", () => ({
  createVendor: vi.fn(), updateVendor: vi.fn(), deleteVendor: vi.fn(),
  createAsset: vi.fn(), updateAsset: vi.fn(), deleteAsset: vi.fn(), disposeAsset: vi.fn(),
  createSubscription: vi.fn(), updateSubscription: vi.fn(), deleteSubscription: vi.fn(),
  createPurchaseRequest: vi.fn(), updatePurchaseRequest: vi.fn(),
  updatePurchaseRequestStatus: vi.fn(), deletePurchaseRequest: vi.fn(),
  createContract: vi.fn(), updateContract: vi.fn(), deleteContract: vi.fn(),
  createMaintenanceRecord: vi.fn(), updateMaintenanceRecord: vi.fn(), deleteMaintenanceRecord: vi.fn(),
  createTransfer: vi.fn(), deleteTransfer: vi.fn(),
}));

let actions: ReturnType<typeof useActions>;
function Harness() {
  actions = useActions();
  return null;
}

describe("ActionsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("rejects useActions outside provider", () => {
    expect(() => render(<Harness />)).toThrow("useActions must be used");
  });

  it("routes every create and edit modal to its API", async () => {
    render(<ActionsProvider><Harness /></ActionsProvider>);
    const cases: Array<[any, any]> = [
      [{ type: "vendor", mode: "create" }, api.createVendor],
      [{ type: "vendor", mode: "edit", item: { id: 1 } }, api.updateVendor],
      [{ type: "asset", mode: "create" }, api.createAsset],
      [{ type: "asset", mode: "edit", item: { id: 1 } }, api.updateAsset],
      [{ type: "subscription", mode: "create" }, api.createSubscription],
      [{ type: "subscription", mode: "edit", item: { id: 1 } }, api.updateSubscription],
      [{ type: "request", mode: "create" }, api.createPurchaseRequest],
      [{ type: "request", mode: "edit", item: { id: 1 } }, api.updatePurchaseRequest],
      [{ type: "contract", mode: "create" }, api.createContract],
      [{ type: "contract", mode: "edit", item: { id: 1 } }, api.updateContract],
      [{ type: "maintenance", mode: "create" }, api.createMaintenanceRecord],
      [{ type: "maintenance", mode: "edit", item: { id: 1 } }, api.updateMaintenanceRecord],
      [{ type: "transfer", mode: "create" }, api.createTransfer],
    ];
    for (const [modal, expected] of cases) {
      await act(async () => actions.openModal(modal));
      await act(async () => actions.submitModal({ name: "payload" } as any));
      expect(expected).toHaveBeenCalled();
    }
    expect(app.refresh).toHaveBeenCalledTimes(cases.length);
  });

  it("routes every delete resource and respects cancel", async () => {
    render(<ActionsProvider><Harness /></ActionsProvider>);
    const cases: Array<[any, any]> = [
      ["vendors", api.deleteVendor], ["assets", api.deleteAsset],
      ["subscriptions", api.deleteSubscription], ["requests", api.deletePurchaseRequest],
      ["contracts", api.deleteContract], ["maintenance", api.deleteMaintenanceRecord],
      ["transfers", api.deleteTransfer],
    ];
    for (const [resource, expected] of cases) {
      await act(async () => actions.deleteResource(resource, 1));
      expect(expected).toHaveBeenCalledWith(1);
    }
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await act(async () => actions.deleteResource("vendors", 2));
    expect(api.deleteVendor).not.toHaveBeenCalledWith(2);
  });

  it("approves, disposes, and revokes assets", async () => {
    render(<ActionsProvider><Harness /></ActionsProvider>);
    await act(async () => actions.approveRequest(1, "APPROVED"));
    expect(api.updatePurchaseRequestStatus).toHaveBeenCalledWith(1, "APPROVED");

    vi.spyOn(window, "prompt")
      .mockReturnValueOnce("2026-07-10")
      .mockReturnValueOnce("1000")
      .mockReturnValueOnce("broken");
    const item = { id: 2, assetCode: "TS-2", name: "Laptop", vendor: { id: 3 } } as any;
    await act(async () => actions.disposeAssetAction(item));
    expect(api.disposeAsset).toHaveBeenCalledWith(2, {
      disposalDate: "2026-07-10", disposalPrice: 1000, disposalReason: "broken",
    });

    await act(async () => actions.revokeAsset(item));
    expect(api.updateAsset).toHaveBeenCalledWith(2, expect.objectContaining({
      assignedEmployeeId: null, status: "IN_STOCK", vendorId: 3,
    }));
  });

  it("reports backend and generic errors", async () => {
    vi.mocked(api.updatePurchaseRequestStatus)
      .mockRejectedValueOnce({ response: { data: { message: "Denied" } } })
      .mockRejectedValueOnce(new Error("down"));
    render(<ActionsProvider><Harness /></ActionsProvider>);

    await act(async () => actions.approveRequest(1, "APPROVED"));
    expect(app.setError).toHaveBeenLastCalledWith("Denied");
    await act(async () => actions.approveRequest(1, "APPROVED"));
    expect(app.setError).toHaveBeenLastCalledWith("Không thể xử lý yêu cầu");
  });
});
