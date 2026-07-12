import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetCategoryTreeSelect } from "./AssetCategoryTreeSelect";

const mocks = vi.hoisted(() => ({
  loadAssetCategoryTree: vi.fn(),
}));

vi.mock("../../services/api", () => ({
  loadAssetCategoryTree: mocks.loadAssetCategoryTree,
}));

const tree = [
  {
    id: 1,
    code: "TB",
    name: "Thiết bị",
    assetClass: "FIXED_ASSET",
    parentId: null,
    active: true,
    children: [
      {
        id: 2,
        code: "LAP",
        name: "Laptop",
        assetClass: "FIXED_ASSET",
        parentId: 1,
        active: true,
        children: [],
      },
    ],
  },
  {
    id: 3,
    code: "ROOM",
    name: "Phòng họp",
    assetClass: "TOOL_EQUIPMENT",
    parentId: null,
    active: true,
    children: [],
  },
];

describe("AssetCategoryTreeSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadAssetCategoryTree.mockResolvedValue(tree);
  });

  it("expands a parent node and selects a leaf", async () => {
    const onChange = vi.fn();
    const onCodeChange = vi.fn();
    render(
      <AssetCategoryTreeSelect
        value=""
        onChange={onChange}
        onCodeChange={onCodeChange}
        label="Danh mục"
        required
      />,
    );
    expect(screen.getByText("Đang tải...")).toBeVisible();
    expect(await screen.findByText("Thiết bị")).toBeVisible();
    expect(screen.getByText("Chọn danh mục ở bên dưới...")).toBeVisible();
    expect(screen.getByText("*")).toBeVisible();
    expect(screen.queryByText("Laptop")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Thiết bị"));
    expect(screen.getByText("Laptop")).toBeVisible();

    fireEvent.click(screen.getByText("Laptop"));
    expect(onChange).toHaveBeenCalledWith("Laptop", "LAP");
    expect(onCodeChange).toHaveBeenCalledWith("LAP");

    fireEvent.click(screen.getByText("Phòng họp"));
    expect(onChange).toHaveBeenCalledWith("Phòng họp", "ROOM");
  });

  it("collapses an expanded branch via the expander button", async () => {
    const { container } = render(<AssetCategoryTreeSelect value="" onChange={vi.fn()} />);
    await screen.findByText("Thiết bị");

    const expander = container.querySelector(".tree-expander") as HTMLButtonElement;
    fireEvent.click(expander);
    expect(screen.getByText("Laptop")).toBeVisible();
    fireEvent.click(expander);
    expect(screen.queryByText("Laptop")).not.toBeInTheDocument();
  });

  it("marks the current value as selected and shows its code", async () => {
    const { container } = render(
      <AssetCategoryTreeSelect value="Phòng họp" categoryCode="ROOM" onChange={vi.fn()} />,
    );
    const node = (await screen.findByText("Phòng họp", { selector: ".tree-label" })).closest(
      ".category-tree-node",
    );
    expect(node).toHaveClass("selected");
    expect(container.querySelector(".category-tree-code-inline")).toHaveTextContent("ROOM");
  });

  it("shows an empty message when loading fails", async () => {
    mocks.loadAssetCategoryTree.mockRejectedValueOnce(new Error("network"));
    render(<AssetCategoryTreeSelect value="" onChange={vi.fn()} />);
    expect(await screen.findByText("Không có danh mục")).toBeVisible();
  });
});
