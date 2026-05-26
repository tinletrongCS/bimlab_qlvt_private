import type { EmployeeLite, ProjectLite } from "../services/types";

export const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function employeeLabel(employee?: EmployeeLite): string {
  if (!employee) return "—";
  const name = employee.fullName || employee.name || `Nhân viên #${employee.id}`;
  return employee.employeeCode ? `${name} · ${employee.employeeCode}` : name;
}

export function projectLabel(project?: ProjectLite): string {
  if (!project) return "—";
  return project.code ? `${project.code} · ${project.name}` : project.name;
}

export function readError(error: unknown): string {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || "Không thể xử lý yêu cầu";
  }
  return "Không thể xử lý yêu cầu";
}
