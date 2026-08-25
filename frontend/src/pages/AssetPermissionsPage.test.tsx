import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetPermissionsPage } from "./AssetPermissionsPage";

const mocks = vi.hoisted(() => ({
  loadAccounts: vi.fn(),
  loadMeta: vi.fn(),
  loadUser: vi.fn(),
  updateUser: vi.fn(),
  resetUser: vi.fn(),
  createPermission: vi.fn(),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

vi.mock("../services/api", () => ({
  loadAuthAccounts: mocks.loadAccounts,
  loadAssetPermissionMeta: mocks.loadMeta,
  loadAssetUserPermissions: mocks.loadUser,
  updateAssetUserPermissions: mocks.updateUser,
  resetAssetUserPermissions: mocks.resetUser,
  createAssetPermission: mocks.createPermission,
}));

const detail = {
  userId: 7,
  username: "tin",
  fullName: "Lê Trọng Tín",
  role: "EMPLOYEE",
  inherited: ["asset_access"],
  added: [],
  removed: [],
  effective: ["asset_access"],
  version: 0,
};

describe("AssetPermissionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadAccounts.mockResolvedValue([
      { id: 7, username: "tin", fullName: "Lê Trọng Tín", role: "EMPLOYEE", enabled: true },
    ]);
    mocks.loadMeta.mockResolvedValue([
      { key: "asset_access", label: "Truy cập QLVT", category: "asset", isSystem: true },
      { key: "asset_manage", label: "Quản lý tài sản", category: "asset", isSystem: true },
    ]);
    mocks.loadUser.mockResolvedValue(detail);
    mocks.updateUser.mockImplementation((_id, permissions) =>
      Promise.resolve({ ...detail, effective: permissions, added: ["asset_manage"], version: 1 }),
    );
    mocks.resetUser.mockResolvedValue(detail);
    mocks.createPermission.mockResolvedValue({
      key: "asset_export",
      label: "Xuất tài sản",
      category: "asset",
      isSystem: false,
    });
  });

  it("loads a user and saves the effective asset permission set", async () => {
    const user = userEvent.setup();
    render(<AssetPermissionsPage />);

    await user.click(await screen.findByRole("checkbox", { name: /Quản lý tài sản/ }));
    await user.click(screen.getByRole("button", { name: /Lưu thay đổi/ }));

    await waitFor(() =>
      expect(mocks.updateUser).toHaveBeenCalledWith(
        7,
        expect.arrayContaining(["asset_access", "asset_manage"]),
        0,
      ),
    );
  });

  it("creates a new asset permission from the QLVT screen", async () => {
    const user = userEvent.setup();
    render(<AssetPermissionsPage />);
    await screen.findByText("Lê Trọng Tín");

    await user.click(screen.getByRole("button", { name: /Thêm quyền/ }));
    const keyInput = screen.getByLabelText(/Mã quyền/);
    await user.clear(keyInput);
    await user.type(keyInput, "asset_export");
    await user.type(screen.getByLabelText(/Tên quyền/), "Xuất tài sản");
    await user.click(screen.getByRole("button", { name: /^Lưu$/ }));

    await waitFor(() =>
      expect(mocks.createPermission).toHaveBeenCalledWith(
        expect.objectContaining({ key: "asset_export", label: "Xuất tài sản" }),
      ),
    );
  });
});
