import { describe, expect, it } from "vitest";
import { employeeLabel, money, projectLabel, readError } from "./format";

describe("format helpers", () => {
  it("formats money as VND without decimals", () => {
    expect(money.format(1234567)).toBe("1.234.567 ₫");
  });

  it("builds employee labels with sensible fallbacks", () => {
    expect(employeeLabel()).toBe("—");
    expect(employeeLabel({ id: 7, fullName: "Nguyen Van A", employeeCode: "EMP-007" })).toBe(
      "Nguyen Van A · EMP-007",
    );
    expect(employeeLabel({ id: 8, name: "Tran B" })).toBe("Tran B");
    expect(employeeLabel({ id: 9 })).toBe("Nhân viên #9");
  });

  it("builds project labels with code prefix when available", () => {
    expect(projectLabel()).toBe("—");
    expect(projectLabel({ id: 1, code: "CDS-001", name: "BIM Lab" })).toBe("CDS-001 · BIM Lab");
    expect(projectLabel({ id: 2, name: "No Code" })).toBe("No Code");
  });

  it("reads API error messages defensively", () => {
    expect(readError({ response: { data: { message: "Sai dữ liệu" } } })).toBe("Sai dữ liệu");
    expect(readError({ response: { data: {} } })).toBe("Không thể xử lý yêu cầu");
    expect(readError(new Error("boom"))).toBe("Không thể xử lý yêu cầu");
  });
});
