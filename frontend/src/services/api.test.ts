import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  let requestHandler: ((config: any) => any) | null = null;
  let responseErrorHandler: ((error: any) => Promise<never>) | null = null;
  const api = {
    interceptors: {
      request: {
        use: vi.fn((handler) => {
          requestHandler = handler;
        }),
      },
      response: {
        use: vi.fn((_ok, handler) => {
          responseErrorHandler = handler;
        }),
      },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
  return {
    api,
    token: vi.fn(),
    requestHandler: () => requestHandler,
    responseErrorHandler: () => responseErrorHandler,
  };
});

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mocks.api),
  },
}));

vi.mock("../auth/oidc", () => ({
  getAccessToken: mocks.token,
}));

describe("asset api client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.token.mockReturnValue(null);
    mocks.api.get.mockReset();
    mocks.api.post.mockReset();
  });

  it("attaches bearer token when present", async () => {
    const { api } = await import("./api");
    mocks.token.mockReturnValue("access-token");
    const headers = { set: vi.fn() };

    const result = mocks.requestHandler()?.({ headers });

    expect(api).toBe(mocks.api);
    expect(result).toEqual({ headers });
    expect(headers.set).toHaveBeenCalledWith("Authorization", "Bearer access-token");
  });

  it("maps current user response and hides failures", async () => {
    const { loadCurrentUser } = await import("./api");
    mocks.api.get.mockResolvedValueOnce({
      data: {
        username: "alice",
        role: "ASSET_ADMIN",
        employeeId: 7,
        permissions: ["asset.read"],
      },
    });

    await expect(loadCurrentUser()).resolves.toEqual({
      username: "alice",
      role: "ASSET_ADMIN",
      id: 7,
      permissions: ["asset.read"],
    });
    expect(mocks.api.get).toHaveBeenCalledWith("/asset/me");

    mocks.api.get.mockRejectedValueOnce(new Error("down"));
    await expect(loadCurrentUser()).resolves.toBeNull();
  });

  it("posts import validate and commit payloads to stable endpoints", async () => {
    const { validateAssetImport, commitAssetImport } = await import("./api");
    mocks.api.post
      .mockResolvedValueOnce({ data: { uploadStatus: "VALID" } })
      .mockResolvedValueOnce({ data: { uploadStatus: "IMPORTED" } });
    const rows = [{ rowNumber: 1, name: "Laptop" }] as any[];

    await expect(validateAssetImport(rows)).resolves.toEqual({ uploadStatus: "VALID" });
    await expect(commitAssetImport({ importMode: "PARTIAL", rows } as any)).resolves.toEqual({
      uploadStatus: "IMPORTED",
    });

    expect(mocks.api.post).toHaveBeenNthCalledWith(1, "/asset/assets/import/validate", { rows });
    expect(mocks.api.post).toHaveBeenNthCalledWith(2, "/asset/assets/import", {
      importMode: "PARTIAL",
      rows,
    });
  });

  it("rejects 410 responses through the response interceptor", async () => {
    await import("./api");
    window.history.pushState({}, "", "/login");
    const error = { response: { status: 410 } };

    await expect(mocks.responseErrorHandler()?.(error)).rejects.toBe(error);
  });
});
