import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { loadAssetCategoryTree } from "../../services/api";
import { AssetCategoryTreeSelect } from "./AssetCategoryTreeSelect";

vi.mock("../../services/api", () => ({
  loadAssetCategoryTree: vi.fn(),
}));

describe("AssetCategoryTreeSelect", () => {
  it("loads, expands parent categories, and selects a leaf", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onCodeChange = vi.fn();
    vi.mocked(loadAssetCategoryTree).mockResolvedValueOnce([
      {
        id: 1,
        code: "ROOT",
        name: "Thiết bị",
        assetClass: "FIXED_ASSET",
        active: true,
        children: [
          {
            id: 2,
            code: "LAPTOP",
            name: "Laptop",
            assetClass: "FIXED_ASSET",
            parentId: 1,
            active: true,
            children: [],
          },
        ],
      },
    ]);

    render(
      <AssetCategoryTreeSelect
        value=""
        label="Danh mục"
        required
        onChange={onChange}
        onCodeChange={onCodeChange}
      />,
    );

    expect(screen.getByText("Đang tải...")).toBeVisible();
    await user.click(await screen.findByText("Thiết bị"));
    await user.click(screen.getByText("Laptop"));

    expect(onChange).toHaveBeenCalledWith("Laptop", "LAPTOP");
    expect(onCodeChange).toHaveBeenCalledWith("LAPTOP");
  });

  it("shows current value, category code, and empty state", async () => {
    vi.mocked(loadAssetCategoryTree).mockRejectedValueOnce(new Error("network"));
    render(<AssetCategoryTreeSelect value="Laptop" categoryCode="LAPTOP" onChange={vi.fn()} />);

    expect(screen.getByText("Laptop")).toBeVisible();
    expect(screen.getByText("LAPTOP")).toBeVisible();
    expect(await screen.findByText("Không có danh mục")).toBeVisible();
  });
});
