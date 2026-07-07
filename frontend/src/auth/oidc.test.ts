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
  });

  it("detects and cleans oidc callback params", async () => {
    window.history.replaceState({}, "", "/?code=c&state=s&keep=1");
    mocks.manager.signinRedirectCallback.mockResolvedValue({ access_token: "token-1" });
    const oidc = await import("./oidc");

    expect(oidc.isOidcCallback()).toBe(true);
    await expect(oidc.handleOidcCallback()).resolves.toBe(true);

    expect(window.location.pathname + window.location.search).toBe("/?keep=1");
    expect(oidc.getAccessToken()).toBe("token-1");
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
