import { type KeyboardEvent, useState } from "react";
import { employeeLabel, projectLabel } from "../../lib/format";
import type {
  DepartmentLite,
  EmployeeLite,
  ProjectLite,
  Vendor,
  WorkSiteLite,
} from "../../services/types";
import { SearchableSelect } from "./SearchableSelect";

interface FieldProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  placeholder,
}: FieldProps) {
  const isNumber = type === "number";
  const isCurrency = type === "currency";
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (isNumber) {
      val = normalizeNumberInput(val);
    } else if (isCurrency) {
      val = val.replace(/[^0-9]/g, "");
    }
    onChange(val);
  };

  const displayValue =
    isCurrency && value && !isFocused ? Number(value).toLocaleString("en-US") : value || "";

  return (
    <label>
      <FormLabel required={required}>{label}</FormLabel>
      <div style={{ position: "relative" }}>
        <input
          value={displayValue}
          onChange={handleChange}
          onKeyDown={isNumber ? blockNumberTextInput : undefined}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          type={isCurrency ? "text" : isNumber ? "text" : type}
          inputMode={isNumber || isCurrency ? "decimal" : undefined}
          autoCapitalize="none"
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          style={isCurrency ? { paddingRight: "30px", width: "100%" } : { width: "100%" }}
        />
        {isCurrency && (
          <span
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#6b7280",
              fontWeight: 700,
              fontSize: "12px",
            }}
          >
            đ
          </span>
        )}
      </div>
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
      <SearchableSelect
        value={value || options[0]?.[0] || ""}
        onChange={onChange}
        options={options.map(([k, v]) => ({ value: k, label: v }))}
      />
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
      <SearchableSelect
        value={value || ""}
        onChange={onChange}
        options={[
          { value: "", label: "Không chọn" },
          ...vendors.map((v) => ({ value: String(v.id), label: v.name })),
        ]}
      />
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
      <SearchableSelect
        value={value || ""}
        onChange={onChange}
        placeholder="Không gán"
        options={[
          { value: "", label: "Không gán" },
          ...employees.map((e) => ({ value: String(e.id), label: employeeLabel(e) })),
        ]}
      />
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
      <SearchableSelect
        value={value || ""}
        onChange={onChange}
        options={[
          { value: "", label: "Không chọn" },
          ...departments.map((d) => ({ value: String(d.id), label: d.name })),
        ]}
      />
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
      <SearchableSelect
        value={value || ""}
        onChange={onChange}
        options={[
          { value: "", label: "Không chọn" },
          ...workSites.map((s) => ({ value: String(s.id), label: s.name })),
        ]}
      />
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
      <SearchableSelect
        value={value || ""}
        onChange={onChange}
        options={[
          { value: "", label: "Không chọn" },
          ...projects.map((p) => ({ value: String(p.id), label: projectLabel(p) })),
        ]}
      />
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
