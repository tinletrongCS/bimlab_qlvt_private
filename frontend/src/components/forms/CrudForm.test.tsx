import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrudForm } from "./CrudForm";

const state = vi.hoisted(() => ({
  modal: null as any,
  close: vi.fn(),
  submit: vi.fn().mockResolvedValue(undefined),
  ensureLookups: vi.fn().mockResolvedValue(undefined),
  ensureAssets: vi.fn().mockResolvedValue(undefined),
  ensureVendors: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../contexts/ActionsContext", () => ({
  useActions: () => ({
    modal: state.modal,
    closeModal: state.close,
    submitModal: state.submit,
    submitting: false,
  }),
}));

vi.mock("../../contexts/AppDataContext", () => ({
  useAppData: () => ({
    vendors: [{ id: 1, name: "Vendor" }],
    employees: [{ id: 2, fullName: "Alice", employeeCode: "E2" }],
    departments: [{ id: 3, name: "BIM" }],
    workSites: [{ id: 4, name: "HCM" }],
    projects: [{ id: 5, name: "Alpha", code: "A" }],
    assets: [{ id: 6, assetCode: "TS-1", name: "Laptop" }],
    ensureLookups: state.ensureLookups,
    ensureAssets: state.ensureAssets,
    ensureVendors: state.ensureVendors,
  }),
}));

describe("CrudForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing without an active modal", () => {
    state.modal = null;
    const { container } = render(<CrudForm />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each(["vendor", "asset", "subscription", "request", "contract", "maintenance", "transfer"])(
    "maps and submits %s create form",
    async (type) => {
      state.modal = { type, mode: "create" };
      const { container } = render(<CrudForm />);
      const form = container.querySelector("form");
      expect(form).not.toBeNull();

      fireEvent.submit(form as HTMLFormElement);

      await waitFor(() => expect(state.submit).toHaveBeenCalledOnce());
      expect(state.submit).toHaveBeenCalledWith(expect.any(Object));
    },
  );

  it.each(["vendor", "asset", "subscription", "request", "contract", "maintenance"])(
    "initializes and submits %s edit form",
    async (type) => {
      state.modal = {
        type,
        mode: "edit",
        item: {
          id: 1, name: "Existing", assetCode: "TS-1", category: "Laptop",
          taxCode: "TAX", contactName: "Contact", email: "a@test", phone: "1", address: "HCM",
          serialNumber: "SN", source: "PURCHASE", vendor: { id: 1, name: "Vendor" },
          assignedEmployeeId: 2, departmentId: 3, siteId: 4, projectId: 5,
          purchaseCost: 10, residualValue: 1, purchaseDate: "2026-01-01",
          warrantyUntil: "2027-01-01", status: "ACTIVE", depreciationMethod: "NONE",
          usefulLifeYears: 5, softwareName: "Software", planName: "Plan", totalSeats: 10,
          usedSeats: 2, cost: 20, billingCycle: "YEARLY", renewalDate: "2027-01-01",
          requestType: "DEVICE", title: "Title", reason: "Reason", estimatedCost: 30,
          requesterEmployeeId: 2, neededDate: "2026-02-01", contractNumber: "HD-1",
          contractValue: 40, currency: "VND", signDate: "2026-01-01",
          effectiveFrom: "2026-01-01", effectiveTo: "2027-01-01", paymentTerms: "Cash",
          attachmentUrl: "file", notes: "Notes", asset: { id: 6 },
          maintenanceType: "REPAIR", maintenanceDate: "2026-03-01", performedBy: "Bob",
          description: "Fix", nextMaintenanceDate: "2026-06-01",
        },
      };
      const { container } = render(<CrudForm />);

      fireEvent.submit(container.querySelector("form") as HTMLFormElement);

      await waitFor(() => expect(state.submit).toHaveBeenCalledOnce());
    },
  );

  it("loads vendors for contracts and assets plus vendors for maintenance", async () => {
    state.modal = { type: "contract", mode: "create" };
    const first = render(<CrudForm />);
    await waitFor(() => expect(state.ensureVendors).toHaveBeenCalled());
    first.unmount();

    state.modal = { type: "maintenance", mode: "create" };
    render(<CrudForm />);
    await waitFor(() => {
      expect(state.ensureAssets).toHaveBeenCalled();
      expect(state.ensureVendors).toHaveBeenCalled();
    });
  });
});
