// Phase 2 PR#5 — feature flag chế độ auth của QLVT FE.
//   VITE_AUTH_MODE=keycloak  → đăng nhập qua Keycloak (Authorization Code + PKCE, token in-memory + Bearer).
//   (mặc định / "legacy")    → giữ NGUYÊN luồng cũ: /auth/login + cookie httpOnly + CSRF.
// Rollback = đổi flag về legacy (hoặc bỏ trống) → 0 thay đổi hành vi.

export type AuthMode = "legacy" | "keycloak";

export const AUTH_MODE: AuthMode =
  import.meta.env.VITE_AUTH_MODE === "legacy" ? "legacy" : "keycloak";

export const isKeycloak = AUTH_MODE === "keycloak";
