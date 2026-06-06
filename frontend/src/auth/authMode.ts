// QLVT FE auth mode — KEYCLOAK-ONLY.
//   Đăng nhập qua Keycloak (Authorization Code + PKCE, token in-memory + Bearer).
//   Luồng legacy (/auth/login + cookie httpOnly + CSRF) đã bị gỡ bỏ.
// Các export được giữ nguyên để importer vẫn biên dịch được.

export type AuthMode = "keycloak";

export const AUTH_MODE: AuthMode = "keycloak";

export const isKeycloak = true;
