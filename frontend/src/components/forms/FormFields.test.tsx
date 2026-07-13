import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { chooseSearchableOption } from "../../test/searchableSelect";
import {
  DepartmentSelect,
  EmployeeSelect,
  empty,
  Field,
  num,
  ProjectSelect,
  Select,
  VendorSelect,
  val,
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
        <Select
          label="Status"
          value="A"
          onChange={onChange}
          options={[
            ["A", "Active"],
            ["I", "Inactive"],
          ]}
        />
        <VendorSelect vendors={[{ id: 1, name: "Vendor" } as any]} onChange={onChange} />
        <EmployeeSelect employees={[{ id: 2, fullName: "Alice" } as any]} onChange={onChange} />
        <DepartmentSelect departments={[{ id: 3, name: "BIM" }]} onChange={onChange} />
        <WorkSiteSelect workSites={[{ id: 4, name: "HCM" } as any]} onChange={onChange} />
        <ProjectSelect projects={[{ id: 5, name: "Alpha", code: "A" }]} onChange={onChange} />
      </>,
    );
    const [status, vendor, employee, department, workSite, project] =
      screen.getAllByRole("combobox");
    chooseSearchableOption(status, "Inactive");
    chooseSearchableOption(vendor, "Vendor");
    chooseSearchableOption(employee, "Alice");
    chooseSearchableOption(department, "BIM");
    chooseSearchableOption(workSite, "HCM");
    chooseSearchableOption(project, "A · Alpha");
    expect(onChange).toHaveBeenCalledTimes(6);
    expect(onChange).toHaveBeenCalledWith("I");
    for (const id of ["1", "2", "3", "4", "5"]) expect(onChange).toHaveBeenCalledWith(id);
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
