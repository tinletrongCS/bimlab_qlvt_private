import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchableSelect } from "./SearchableSelect";

describe("SearchableSelect", () => {
  it("keeps a native select bridge for forms and tests", () => {
    const onChange = vi.fn();
    render(
      <SearchableSelect value="" onChange={onChange}>
        <option value="">Không chọn</option>
        <option value="A">Alpha</option>
      </SearchableSelect>,
    );

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "A" } });
    expect(onChange).toHaveBeenCalledWith("A");
  });

  it("opens, filters, selects, and closes from the custom input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchableSelect
        value=""
        onChange={onChange}
        options={[
          { value: "", label: "Không chọn" },
          { value: "A", label: "Alpha" },
          { value: "B", label: "Beta" },
        ]}
      />,
    );

    const input = screen.getByPlaceholderText("Không chọn");
    await user.click(input);
    const openDropdown = document.querySelector(".searchable-select-dropdown") as HTMLElement;
    expect(within(openDropdown).getByText("Alpha")).toBeVisible();

    await user.click(within(openDropdown).getByText("Beta"));

    expect(onChange).toHaveBeenCalledWith("B");
    expect(document.querySelector(".searchable-select-dropdown")).not.toBeInTheDocument();
  });

  it("does not open while disabled and renders an empty search result", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const app = render(
      <SearchableSelect
        disabled
        value=""
        onChange={onChange}
        options={[{ value: "A", label: "Alpha" }]}
      />,
    );

    await user.click(screen.getByPlaceholderText("Không chọn"));
    expect(document.querySelector(".searchable-select-dropdown")).not.toBeInTheDocument();

    app.rerender(
      <SearchableSelect value="" onChange={onChange} options={[{ value: "A", label: "Alpha" }]} />,
    );
    await user.click(screen.getByPlaceholderText("Không chọn"));
    await user.type(screen.getByPlaceholderText("Không chọn"), "zzz");
    expect(screen.getByText("Không tìm thấy")).toBeVisible();
  });
});
