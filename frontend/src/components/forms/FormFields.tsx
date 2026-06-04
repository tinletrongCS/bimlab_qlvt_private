import type { KeyboardEvent } from "react";
import { employeeLabel, projectLabel } from "../../lib/format";
import type {
  DepartmentLite,
  EmployeeLite,
  ProjectLite,
  Vendor,
  WorkSiteLite,
} from "../../services/types";

interface FieldProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}

export function Field({ label, value, onChange, type = "text", required = false }: FieldProps) {
  const isNumber = type === "number";

  return (
    <label>
      <FormLabel required={required}>{label}</FormLabel>
      <input
        value={value || ""}
        onChange={(event) =>
          onChange(isNumber ? normalizeNumberInput(event.target.value) : event.target.value)
        }
        onKeyDown={isNumber ? blockNumberTextInput : undefined}
        type={isNumber ? "text" : type}
        inputMode={isNumber ? "decimal" : undefined}
        autoCapitalize="none"
        required={required}
      />
    </label>
  );
}

interface SelectProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  required?: boolean;
}

export function Select({ label, value, onChange, options, required = false }: SelectProps) {
  return (
    <label>
      <FormLabel required={required}>{label}</FormLabel>
      <select
        value={value || options[0]?.[0] || ""}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      >
        {options.map(([key, labelText]) => (
          <option key={key} value={key}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

export function VendorSelect({
  vendors,
  value,
  onChange,
}: {
  vendors: Vendor[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <FormLabel>Nhà cung cấp</FormLabel>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
        <option value="">Không chọn</option>
        {vendors.map((vendor) => (
          <option key={vendor.id} value={vendor.id}>
            {vendor.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function EmployeeSelect({
  employees,
  value,
  onChange,
}: {
  employees: EmployeeLite[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <FormLabel>Nhân viên sử dụng</FormLabel>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
        <option value="">Không gán</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employeeLabel(employee)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DepartmentSelect({
  departments,
  value,
  onChange,
}: {
  departments: DepartmentLite[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <FormLabel>Phòng ban</FormLabel>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
        <option value="">Không chọn</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function WorkSiteSelect({
  workSites,
  value,
  onChange,
}: {
  workSites: WorkSiteLite[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <FormLabel>Site làm việc</FormLabel>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
        <option value="">Không chọn</option>
        {workSites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ProjectSelect({
  projects,
  value,
  onChange,
}: {
  projects: ProjectLite[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <FormLabel>Dự án CDS</FormLabel>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
        <option value="">Không chọn</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {projectLabel(project)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FormLabel({
  children,
  required = false,
}: {
  children: string;
  required?: boolean;
}) {
  return (
    <span className="form-label-text">
      {children} {required && <span className="form-required">*</span>}
    </span>
  );
}

function normalizeNumberInput(value: string): string {
  const normalized = value.replace(/,/g, ".");
  const [integerPart, ...decimalParts] = normalized.replace(/[^\d.]/g, "").split(".");
  return decimalParts.length > 0 ? `${integerPart}.${decimalParts.join("")}` : integerPart;
}

function blockNumberTextInput(event: KeyboardEvent<HTMLInputElement>) {
  const allowedControlKeys = new Set([
    "Backspace",
    "Delete",
    "Tab",
    "Enter",
    "Escape",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
  ]);

  if (event.ctrlKey || event.metaKey || allowedControlKeys.has(event.key)) return;
  if (/^\d$/.test(event.key)) return;
  if ((event.key === "." || event.key === ",") && !event.currentTarget.value.includes(".")) return;
  event.preventDefault();
}

export function empty(value?: string): string | undefined {
  return value?.trim() || undefined;
}

export function num(value?: string): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function val(value?: string | number | null): string {
  return value == null ? "" : String(value);
}
