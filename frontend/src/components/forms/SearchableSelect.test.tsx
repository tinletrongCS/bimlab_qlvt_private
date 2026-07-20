import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchableSelect } from "./SearchableSelect";

function openDropdown(container: HTMLElement) {
  fireEvent.mouseDown(container.querySelector(".searchable-select-input-wrapper") as HTMLElement);
}

function getDropdown(container: HTMLElement) {
  const dropdown = container.querySelector(".searchable-select-dropdown");
  expect(dropdown).not.toBeNull();
  return within(dropdown as HTMLElement);
}

describe("SearchableSelect", () => {
  const options = [
    { value: "", label: "Không chọn" },
    { value: "1", label: "Laptop Dell" },
    { value: "2", label: "Màn hình LG" },
  ];

  it("shows the selected label and picks an option from the dropdown", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SearchableSelect value="1" onChange={onChange} options={options} />,
    );
    const input = screen.getByRole("combobox");
    expect(input).toHaveValue("Laptop Dell");

    openDropdown(container);
    const dropdown = getDropdown(container);
    expect(dropdown.getByText("Màn hình LG")).toBeVisible();
    expect(dropdown.getByText("Laptop Dell")).toHaveClass("selected");

    fireEvent.mouseDown(dropdown.getByText("Màn hình LG"));
    expect(onChange).toHaveBeenCalledWith("2");
    expect(container.querySelector(".searchable-select-dropdown")).not.toBeInTheDocument();
  });

  it("filters options by search text and reports when nothing matches", () => {
    const { container } = render(
      <SearchableSelect value="" onChange={vi.fn()} options={options} />,
    );
    openDropdown(container);
    const input = screen.getByRole("combobox");
    const dropdown = getDropdown(container);

    fireEvent.change(input, { target: { value: "màn" } });
    expect(dropdown.getByText("Màn hình LG")).toBeVisible();
    expect(dropdown.queryByText("Laptop Dell")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "zzz" } });
    expect(dropdown.getByText("Không tìm thấy")).toBeVisible();
  });

  it("collects options from children including fragments", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SearchableSelect value="a" onChange={onChange}>
        {/* biome-ignore lint/complexity/noUselessFragments: exercises the fragment-unwrapping branch */}
        <>
          <option value="a">Alpha</option>
        </>
        <option value="b">Beta</option>
      </SearchableSelect>,
    );
    openDropdown(container);
    fireEvent.mouseDown(getDropdown(container).getByText("Beta"));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("joins composite option labels without commas", () => {
    render(
      <SearchableSelect value="1" onChange={vi.fn()}>
        <option value="1">TS-001 {" - "} Laptop Dell</option>
      </SearchableSelect>,
    );
    expect(screen.getByRole("combobox")).toHaveValue("TS-001 - Laptop Dell");
  });

  it("toggles closed on a second wrapper press and on outside clicks", () => {
    const { container } = render(
      <SearchableSelect value="" onChange={vi.fn()} options={options} />,
    );
    openDropdown(container);
    expect(getDropdown(container).getByText("Laptop Dell")).toBeVisible();
    openDropdown(container);
    expect(container.querySelector(".searchable-select-dropdown")).not.toBeInTheDocument();

    openDropdown(container);
    fireEvent.mouseDown(document.body);
    expect(container.querySelector(".searchable-select-dropdown")).not.toBeInTheDocument();
  });

  it("opens and closes from presses on the input itself", () => {
    const { container } = render(
      <SearchableSelect value="" onChange={vi.fn()} options={options} />,
    );
    const input = screen.getByRole("combobox");

    fireEvent.mouseDown(input);
    expect(getDropdown(container).getByText("Laptop Dell")).toBeVisible();

    fireEvent.change(input, { target: { value: "lap" } });
    fireEvent.mouseDown(input);
    expect(getDropdown(container).getByText("Laptop Dell")).toBeVisible();

    fireEvent.change(input, { target: { value: "" } });
    input.focus();
    fireEvent.mouseDown(input);
    expect(container.querySelector(".searchable-select-dropdown")).not.toBeInTheDocument();
  });

  it("stays closed when disabled and falls back to the placeholder", () => {
    const { container } = render(
      <SearchableSelect
        value="404"
        onChange={vi.fn()}
        options={options}
        disabled
        placeholder="Chọn thiết bị"
      />,
    );
    expect(screen.getByRole("combobox")).toHaveAttribute("placeholder", "Chọn thiết bị");
    openDropdown(container);
    expect(container.querySelector(".searchable-select-dropdown")).not.toBeInTheDocument();
  });
});
