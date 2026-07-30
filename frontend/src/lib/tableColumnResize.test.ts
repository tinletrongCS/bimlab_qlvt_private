import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { enableTableColumnResize } from "./tableColumnResize";

describe("table column resize", () => {
  it("resizes by dragging and fits content on double click", () => {
    document.body.innerHTML =
      "<main><table><thead><tr><th>Tài sản</th></tr></thead><tbody><tr><td>Laptop Dell Precision</td></tr><tr hidden><td>Nội dung rất dài ở trang khác</td></tr></tbody></table></main>";
    const root = document.querySelector("main") as HTMLElement;
    const header = document.querySelector("th") as HTMLTableCellElement;
    const cell = document.querySelector("td") as HTMLTableCellElement;
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const width = this.textContent?.includes("Nội dung rất dài")
          ? 400
          : this.textContent?.includes("Laptop")
            ? 180
            : 100;
        return { left: 0, right: width, width } as DOMRect;
      });
    const cleanup = enableTableColumnResize(root);

    fireEvent.mouseDown(header, { clientX: 98 });
    fireEvent.mouseMove(document, { clientX: 128 });
    fireEvent.mouseUp(document);
    expect(header.style.width).toBe("130px");

    fireEvent.doubleClick(header, { clientX: 98 });
    expect(header.style.width).toBe("180px");
    expect(cell.style.width).toBe("180px");
    cleanup();
    rectSpy.mockRestore();
  });

  it("keeps action columns fixed", () => {
    document.body.innerHTML =
      '<main><table><thead><tr><th data-column-resize="locked">Thao tác</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table></main>';
    const root = document.querySelector("main") as HTMLElement;
    const header = document.querySelector("th") as HTMLTableCellElement;
    header.getBoundingClientRect = () => ({ left: 0, right: 86, width: 86 }) as DOMRect;
    const cleanup = enableTableColumnResize(root);

    fireEvent.mouseDown(header, { clientX: 84 });
    fireEvent.mouseMove(document, { clientX: 120 });
    fireEvent.mouseUp(document);

    expect(header.style.width).toBe("");
    cleanup();
  });
});
