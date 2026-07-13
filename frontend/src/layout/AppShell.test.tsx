import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";

const state = vi.hoisted(() => ({
  loading: false,
  error: "",
  refresh: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { username: "admin", fullName: "Admin BIMLab" },
    logout: state.logout,
    hasPermission: () => true,
    submitting: false,
  }),
}));
vi.mock("../contexts/AppDataContext", () => ({
  useAppData: () => ({
    loading: state.loading,
    error: state.error,
    refresh: state.refresh,
    vendors: [],
    employees: [],
    departments: [],
    workSites: [],
    projects: [],
    assets: [],
    ensureLookups: vi.fn(),
    ensureAssets: vi.fn(),
    ensureVendors: vi.fn(),
  }),
}));
vi.mock("../contexts/ActionsContext", () => ({
  useActions: () => ({ modal: null, submitting: false }),
}));

function renderShell() {
  return render(
    <MemoryRouter initialEntries={["/assets"]}>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route path="assets" element={<div>Asset content</div>} />
        </Route>
        <Route path="/login" element={<div>Login destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.loading = false;
    state.error = "";
  });

  it("searches, collapses, opens mobile menu, refreshes, and logs out", async () => {
    const user = userEvent.setup();
    renderShell();
    expect(screen.getByText("Asset content")).toBeVisible();

    await user.type(screen.getByLabelText("Tìm menu chính"), "hợp đồng");
    expect(screen.getByText("Hợp đồng")).toBeVisible();
    await user.click(screen.getByLabelText("Xóa tìm kiếm menu"));
    await user.click(screen.getByLabelText("Thu nhỏ menu"));
    await user.click(screen.getByLabelText("Mở rộng menu"));
    await user.click(screen.getByLabelText("Mở menu"));
    await user.click(screen.getByLabelText("Đóng menu"));
    await user.click(screen.getAllByTitle("Làm mới")[0]);
    await waitFor(() => expect(state.refresh).toHaveBeenCalled());
    await user.click(screen.getByTitle("Đăng xuất"));
    await waitFor(() => expect(screen.getByText("Login destination")).toBeVisible());
  });

  it("renders error and loading content", () => {
    state.loading = true;
    state.error = "Backend unavailable";
    renderShell();
    expect(screen.getByText("Backend unavailable")).toBeVisible();
    expect(document.querySelector(".skeleton-content")).not.toBeNull();
    fireEvent.click(screen.getAllByTitle("Làm mới")[0]);
  });
});
