import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

const mocks = vi.hoisted(() => ({
  callback: vi.fn(), callbackCheck: vi.fn(), login: vi.fn(), logout: vi.fn(),
  silent: vi.fn(), loadUser: vi.fn(), sessionLost: null as null | ((reason: string) => void),
  toast: vi.fn(),
}));

vi.mock("../auth/oidc", () => ({
  handleOidcCallback: mocks.callback,
  isOidcCallback: mocks.callbackCheck,
  keycloakLogin: mocks.login,
  keycloakLogout: mocks.logout,
  trySilentLogin: mocks.silent,
  onSessionLost: vi.fn((handler) => { mocks.sessionLost = handler; }),
}));
vi.mock("../services/api", () => ({ loadCurrentUser: mocks.loadUser }));
vi.mock("react-hot-toast", () => ({ default: { error: mocks.toast } }));

let auth: ReturnType<typeof useAuth>;
function Harness() {
  auth = useAuth();
  return <div>{auth.bootstrapping ? "loading" : auth.user?.username || "guest"}</div>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionLost = null;
    mocks.callbackCheck.mockReturnValue(false);
    mocks.silent.mockResolvedValue(true);
    mocks.loadUser.mockResolvedValue({ username: "alice", role: "USER", permissions: ["asset_access"] });
    mocks.login.mockResolvedValue(undefined);
    mocks.logout.mockResolvedValue(undefined);
  });

  it("rejects useAuth outside provider", () => {
    expect(() => render(<Harness />)).toThrow("useAuth must be used");
  });

  it("restores silent session and handles session loss", async () => {
    render(<AuthProvider><Harness /></AuthProvider>);
    expect(await screen.findByText("alice")).toBeVisible();
    expect(auth.hasPermission()).toBe(true);
    expect(auth.hasPermission("asset_access")).toBe(true);
    expect(auth.hasPermission("asset_manage")).toBe(false);

    act(() => mocks.sessionLost?.("expired"));
    expect(screen.getByText("guest")).toBeVisible();
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining("hết hạn"), expect.anything());
    act(() => mocks.sessionLost?.("signed-out"));
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining("đăng xuất"), expect.anything());
  });

  it("handles callback bootstrap and redirects when no session", async () => {
    mocks.callbackCheck.mockReturnValue(true);
    mocks.callback.mockResolvedValue(false);
    render(<AuthProvider><Harness /></AuthProvider>);
    await waitFor(() => expect(mocks.login).toHaveBeenCalled());
    expect(mocks.loadUser).not.toHaveBeenCalled();
  });

  it("reports login errors and tolerates logout failure", async () => {
    render(<AuthProvider><Harness /></AuthProvider>);
    await screen.findByText("alice");
    mocks.login.mockRejectedValueOnce({ response: { data: { message: "SSO down" } } });
    await act(async () => expect(auth.login()).resolves.toBe(false));
    expect(auth.loginError).toBe("SSO down");

    mocks.logout.mockRejectedValueOnce(new Error("expired"));
    await act(async () => auth.logout());
    expect(screen.getByText("guest")).toBeVisible();
  });

  it("grants all permissions to ADMIN", async () => {
    mocks.loadUser.mockResolvedValueOnce({ username: "root", role: "ADMIN", permissions: [] });
    render(<AuthProvider><Harness /></AuthProvider>);
    await screen.findByText("root");
    expect(auth.hasPermission("asset_manage")).toBe(true);
  });
});
