import type { DepartmentLite, EmployeeLite, ProjectLite, Vendor, WorkSiteLite } from '../../services/types'
import { employeeLabel, projectLabel } from '../../lib/format'

interface FieldProps {
  label: string
  value?: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}

export function Field({ label, value, onChange, type = 'text', required = false }: FieldProps) {
  return (
    <label>
      {label}
      <input
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
      />
    </label>
  )
}

interface SelectProps {
  label: string
  value?: string
  onChange: (value: string) => void
  options: Array<[string, string]>
}

export function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <label>
      {label}
      <select value={value || options[0]?.[0] || ''} onChange={(event) => onChange(event.target.value)}>
        {options.map(([key, labelText]) => (
          <option key={key} value={key}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  )
}

export function VendorSelect({
  vendors,
  value,
  onChange,
}: {
  vendors: Vendor[]
  value?: string
  onChange: (value: string) => void
}) {
  return (
    <label>
      Nhà cung cấp
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Không chọn</option>
        {vendors.map((vendor) => (
          <option key={vendor.id} value={vendor.id}>
            {vendor.name}
          </option>
        ))}
      </select>
    </label>
  )
}

export function EmployeeSelect({
  employees,
  value,
  onChange,
}: {
  employees: EmployeeLite[]
  value?: string
  onChange: (value: string) => void
}) {
  return (
    <label>
      Nhân viên sử dụng
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Không gán</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employeeLabel(employee)}
          </option>
        ))}
      </select>
    </label>
  )
}

export function DepartmentSelect({
  departments,
  value,
  onChange,
}: {
  departments: DepartmentLite[]
  value?: string
  onChange: (value: string) => void
}) {
  return (
    <label>
      Phòng ban
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Không chọn</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </select>
    </label>
  )
}

export function WorkSiteSelect({
  workSites,
  value,
  onChange,
}: {
  workSites: WorkSiteLite[]
  value?: string
  onChange: (value: string) => void
}) {
  return (
    <label>
      Site làm việc
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Không chọn</option>
        {workSites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ProjectSelect({
  projects,
  value,
  onChange,
}: {
  projects: ProjectLite[]
  value?: string
  onChange: (value: string) => void
}) {
  return (
    <label>
      Dự án CDS
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Không chọn</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {projectLabel(project)}
          </option>
        ))}
      </select>
    </label>
  )
}

export function empty(value?: string): string | undefined {
  return value?.trim() || undefined
}

export function num(value?: string): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function val(value?: string | number | null): string {
  return value == null ? '' : String(value)
}
