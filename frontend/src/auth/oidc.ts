// Phase 2 PR#5/#6 — Keycloak OIDC (Authorization Code + PKCE) cho QLVT FE.
//
// Pin bảo mật:
//  - Access token + refresh token chỉ giữ IN-MEMORY (userStore = InMemoryWebStorage) → KHÔNG localStorage.
//  - State handshake PKCE (code_verifier + state) sống qua redirect → sessionStorage (mặc định, ngắn hạn).
//  - PR#6: refresh token rotation qua automaticSilentRenew (oidc-client-ts dùng refresh_token, KHÔNG iframe
//    → tránh chặn third-party-cookie). Logout = signoutRedirect (end-session SLO của Keycloak).
import {
  InMemoryWebStorage,
  type User,
  UserManager,
  type UserManagerSettings,
  WebStorageStateStore,
} from "oidc-client-ts";

let accessToken: string | null = null;
let sessionLostHandler: (() => void) | null = null;

/** Token hiện tại để axios gắn Authorization: Bearer. null nếu chưa/không còn đăng nhập. */
export function getAccessToken(): string | null {
  return accessToken;
}

/** Đăng ký callback khi mất phiên (refresh thất bại / token hết hạn không gia hạn được). */
export function onSessionLost(handler: () => void): void {
  sessionLostHandler = handler;
}

function buildSettings(): UserManagerSettings {
  const origin = window.location.origin;
  return {
    authority: import.meta.env.VITE_KEYCLOAK_AUTHORITY ?? "http://localhost:8081/realms/bimlab",
    client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "qlvt",
    redirect_uri: import.meta.env.VITE_KEYCLOAK_REDIRECT_URI ?? `${origin}/`,
    post_logout_redirect_uri: `${origin}/login`,
    response_type: "code",
    // Chỉ cần "openid" — user info + permissions lấy từ /api/asset/me (KHÔNG dùng OIDC profile/userinfo).
    scope: "openid",
    // Access/refresh token in-memory; state (PKCE) mặc định sessionStorage.
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    // PR#6: tự gia hạn access token (5') bằng refresh token TRƯỚC khi hết hạn 60s.
    automaticSilentRenew: true,
    accessTokenExpiringNotificationTimeInSeconds: 60,
    monitorSession: false,
  };
}

let manager: UserManager | null = null;
function userManager(): UserManager {
  if (!manager) {
    manager = new UserManager(buildSettings());
    // Silent-renew thành công → cập nhật token in-memory (api.ts đọc qua getAccessToken).
    manager.events.addUserLoaded((user) => {
      adopt(user);
    });
    // Refresh thất bại / hết hạn không gia hạn được → mất phiên → báo AuthContext logout cục bộ.
    manager.events.addSilentRenewError(() => loseSession());
    manager.events.addAccessTokenExpired(() => loseSession());
  }
  return manager;
}

function adopt(user: User | null): boolean {
  accessToken = user?.access_token ?? null;
  return Boolean(accessToken);
}

function loseSession(): void {
  accessToken = null;
  sessionLostHandler?.();
}

/** URL hiện tại có phải callback từ Keycloak (?code=&state=) không. */
export function isOidcCallback(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has("code") && params.has("state");
}

/** Xử lý callback: đổi code→token (PKCE), giữ token in-memory, dọn ?code&state khỏi URL. */
export async function handleOidcCallback(): Promise<boolean> {
  const user = await userManager().signinRedirectCallback();
  const ok = adopt(user);
  window.history.replaceState({}, document.title, window.location.pathname);
  return ok;
}

/**
 * Hoàn tất callback trong IFRAME silent-renew của oidc-client-ts (prompt=none): relay ?code/&error
 * về tab cha (postMessage) rồi DỪNG — KHÔNG render app. Nếu thiếu, iframe render full SPA, không báo
 * về cha → signinSilent() ở cha timeout ~10s → mất phiên. Chỉ gọi khi ở iframe (self!==top + ?state&code|error).
 */
export async function completeSilentRenewCallback(): Promise<void> {
  try {
    await userManager().signinSilentCallback();
  } catch {
    // Tab cha tự xử lý timeout/lỗi — không làm gì thêm trong iframe.
  }
}

/** Khôi phục phiên khi reload, dựa session SSO Keycloak (prompt=none). Thất bại = chưa đăng nhập. */
export async function trySilentLogin(): Promise<boolean> {
  try {
    const user = await userManager().signinSilent();
    return adopt(user);
  } catch {
    return false;
  }
}

/** Bắt đầu đăng nhập: redirect sang trang login Keycloak. Trang sẽ điều hướng đi (không trả về). */
export async function keycloakLogin(): Promise<void> {
  await userManager().signinRedirect();
}

/**
 * Đăng xuất ĐẦY ĐỦ (PR#6 — Single Logout): gọi end-session endpoint của Keycloak (kết thúc session SSO)
 * + redirect về post_logout_redirect_uri (/login). id_token_hint lấy tự động từ user đã lưu.
 * Fallback: nếu signoutRedirect lỗi → dọn cục bộ.
 */
export async function keycloakLogout(): Promise<void> {
  accessToken = null;
  try {
    await userManager().signoutRedirect();
  } catch {
    try {
      await userManager().removeUser();
    } catch {
      // ignore
    }
  }
}
