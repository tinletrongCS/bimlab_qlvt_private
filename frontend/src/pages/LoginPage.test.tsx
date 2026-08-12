import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";

const auth = vi.hoisted(() => ({
  value: {} as any,
  login: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../contexts/AuthContext", () => ({ useAuth: () => auth.value }));
vi.mock("animejs", () => ({
  animate: vi.fn(),
  stagger: vi.fn(() => 0),
  createTimeline: vi.fn(() => ({ add: vi.fn().mockReturnThis() })),
}));

function renderLogin(initial = "/login") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>Dashboard destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.value = {
      user: null,
      bootstrapping: false,
      submitting: false,
      loginError: "",
      login: auth.login,
    };
  });

  it("starts Keycloak login and renders SSO scene", async () => {
    renderLogin();
    await waitFor(() => expect(auth.login).toHaveBeenCalledOnce());
    expect(screen.getByText(/Đăng nhập/i)).toBeVisible();
  });

  it("shows login error", async () => {
    auth.value.loginError = "Keycloak unavailable";
    renderLogin();
    await waitFor(() => expect(auth.login).toHaveBeenCalledOnce());
    expect(screen.getByText("Keycloak unavailable")).toBeVisible();
  });

  it("shows bootstrap skeleton", () => {
    auth.value.bootstrapping = true;
    renderLogin();
    expect(auth.login).not.toHaveBeenCalled();
    expect(document.querySelector(".skeleton-login-card")).not.toBeNull();
  });

  it("redirects authenticated users", async () => {
    auth.value.user = { id: 1, username: "admin" };
    renderLogin();
    expect(await screen.findByText("Dashboard destination")).toBeVisible();
    expect(auth.login).not.toHaveBeenCalled();
  });
});
