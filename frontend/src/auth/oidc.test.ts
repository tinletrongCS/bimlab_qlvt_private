import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const manager = {
    events: {
      addUserLoaded: vi.fn(),
      addSilentRenewError: vi.fn(),
      addAccessTokenExpired: vi.fn(),
      addUserSignedOut: vi.fn(),
    },
    signinRedirectCallback: vi.fn(),
    signinSilentCallback: vi.fn(),
    getUser: vi.fn(),
    signinSilent: vi.fn(),
    signinRedirect: vi.fn(),
    signoutRedirect: vi.fn(),
    removeUser: vi.fn(),
  };
  return {
    manager,
    // biome-ignore lint/complexity/useArrowFunction: oidc-client UserManager is constructed with new.
    UserManager: vi.fn(function () {
      return manager;
    }),
    WebStorageStateStore: vi.fn(),
  };
});

vi.mock("oidc-client-ts", () => ({
  UserManager: mocks.UserManager,
  WebStorageStateStore: mocks.WebStorageStateStore,
}));

describe("QLVT oidc helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/");
    sessionStorage.clear();
    // biome-ignore lint/suspicious/noDocumentCookie: jsdom setup for the browser cookie fallback.
    document.cookie = "qlvt_oidc_return_url=; Path=/; Max-Age=0";
  });

  it("detects and cleans oidc callback params", async () => {
    window.history.replaceState({}, "", "/?code=c&state=s&keep=1");
    mocks.manager.signinRedirectCallback.mockResolvedValue({ access_token: "token-1" });
    const oidc = await import("./oidc");

    expect(oidc.isOidcCallback()).toBe(true);
    await expect(
      Promise.all([oidc.handleOidcCallback(), oidc.handleOidcCallback()]),
    ).resolves.toEqual([
      { authenticated: true, returnUrl: null },
      { authenticated: true, returnUrl: null },
    ]);

    expect(mocks.manager.signinRedirectCallback).toHaveBeenCalledOnce();
    expect(window.location.pathname + window.location.search).toBe("/?keep=1");
    expect(oidc.getAccessToken()).toBe("token-1");
  });

  it("returns only safe same-origin login destinations", async () => {
    const oidc = await import("./oidc");
    sessionStorage.setItem("qlvt:oidc:return-url", "/asset-qr.html?token=qr-token");
    expect(oidc.consumeLoginReturnUrl()).toBe("/asset-qr.html?token=qr-token");
    expect(oidc.consumeLoginReturnUrl()).toBe("/asset-qr.html?token=qr-token");

    vi.resetModules();
    const freshOidc = await import("./oidc");
    sessionStorage.setItem("qlvt:oidc:return-url", "//evil.example");
    expect(freshOidc.consumeLoginReturnUrl()).toBeNull();

    window.history.replaceState({}, "", "/login?returnTo=%2Fasset-qr.html%3Ftoken%3Dquery-token");
    vi.resetModules();
    const queryOidc = await import("./oidc");
    expect(queryOidc.consumeLoginReturnUrl()).toBe("/asset-qr.html?token=query-token");

    window.history.replaceState({}, "", "/");
    // biome-ignore lint/suspicious/noDocumentCookie: jsdom setup for the browser cookie fallback.
    document.cookie =
      "qlvt_oidc_return_url=%2Fasset-qr.html%3Ftoken%3Dcookie-token; Path=/; SameSite=Lax";
    vi.resetModules();
    const cookieOidc = await import("./oidc");
    expect(cookieOidc.consumeLoginReturnUrl()).toBe("/asset-qr.html?token=cookie-token");
    expect(document.cookie).not.toContain("qlvt_oidc_return_url");
  });

  it("keeps the QR return URL in the OIDC transaction state", async () => {
    window.history.replaceState({}, "", "/login?returnTo=%2Fasset-qr.html%3Ftoken%3Dqr-token");
    mocks.manager.signinRedirectCallback.mockResolvedValue({
      access_token: "token-1",
      state: { returnUrl: "/asset-qr.html?token=qr-token" },
    });
    const oidc = await import("./oidc");

    await oidc.keycloakLogin();
    expect(mocks.manager.signinRedirect).toHaveBeenCalledWith({
      state: { returnUrl: "/asset-qr.html?token=qr-token" },
    });

    await expect(oidc.handleOidcCallback()).resolves.toEqual({
      authenticated: true,
      returnUrl: "/asset-qr.html?token=qr-token",
    });
  });

  it("restores non-expired stored user without silent renew", async () => {
    mocks.manager.getUser.mockResolvedValue({ expired: false, access_token: "stored-token" });
    const oidc = await import("./oidc");

    await expect(oidc.trySilentLogin()).resolves.toBe(true);

    expect(mocks.manager.signinSilent).not.toHaveBeenCalled();
    expect(oidc.getAccessToken()).toBe("stored-token");
  });

  it("renews expired stored user and returns false on renew failure", async () => {
    mocks.manager.getUser.mockResolvedValueOnce({ expired: true });
    mocks.manager.signinSilent.mockResolvedValueOnce({ access_token: "renewed-token" });
    const oidc = await import("./oidc");

    await expect(oidc.trySilentLogin()).resolves.toBe(true);
    expect(oidc.getAccessToken()).toBe("renewed-token");

    mocks.manager.getUser.mockRejectedValueOnce(new Error("down"));
    await expect(oidc.trySilentLogin()).resolves.toBe(false);
  });
});
