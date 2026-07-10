import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DepartmentSelect,
  EmployeeSelect,
  empty,
  Field,
  num,
  ProjectSelect,
  Select,
  val,
  VendorSelect,
  WorkSiteSelect,
} from "./FormFields";

describe("FormFields", () => {
  it("normalizes numeric input and blocks invalid keys", () => {
    const onChange = vi.fn();
    render(<Field label="Cost" type="number" value="" onChange={onChange} required />);
    const input = screen.getByLabelText(/Cost/);
    fireEvent.change(input, { target: { value: "1,2x.3" } });
    expect(onChange).toHaveBeenCalledWith("1.23");
    expect(fireEvent.keyDown(input, { key: "x" })).toBe(false);
    expect(fireEvent.keyDown(input, { key: "4" })).toBe(true);
    expect(fireEvent.keyDown(input, { key: "Backspace" })).toBe(true);
  });

  it("renders all selects and emits selected IDs", () => {
    const onChange = vi.fn();
    render(
      <>
        <Select label="Status" value="A" onChange={onChange} options={[["A", "Active"], ["I", "Inactive"]]} />
        <VendorSelect vendors={[{ id: 1, name: "Vendor" } as any]} onChange={onChange} />
        <EmployeeSelect employees={[{ id: 2, fullName: "Alice" } as any]} onChange={onChange} />
        <DepartmentSelect departments={[{ id: 3, name: "BIM" }]} onChange={onChange} />
        <WorkSiteSelect workSites={[{ id: 4, name: "HCM" } as any]} onChange={onChange} />
        <ProjectSelect projects={[{ id: 5, name: "Alpha", code: "A" }]} onChange={onChange} />
      </>,
    );
    for (const select of screen.getAllByRole("combobox")) {
      if (select.querySelector('option[value="1"]')) fireEvent.change(select, { target: { value: "1" } });
      else if (select.querySelector('option[value="2"]')) fireEvent.change(select, { target: { value: "2" } });
      else if (select.querySelector('option[value="3"]')) fireEvent.change(select, { target: { value: "3" } });
      else if (select.querySelector('option[value="4"]')) fireEvent.change(select, { target: { value: "4" } });
      else if (select.querySelector('option[value="5"]')) fireEvent.change(select, { target: { value: "5" } });
      else fireEvent.change(select, { target: { value: "I" } });
    }
    expect(onChange).toHaveBeenCalledTimes(6);
  });

  it("converts optional values", () => {
    expect(empty("  ")).toBeUndefined();
    expect(empty(" x ")).toBe("x");
    expect(num()).toBeNull();
    expect(num("1,5")).toBe(1.5);
    expect(num("bad")).toBeNull();
    expect(val(null)).toBe("");
    expect(val(7)).toBe("7");
  });
});
