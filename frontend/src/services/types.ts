export type Permission =
  | 'asset_access'
  | 'asset_view_self'
  | 'asset_view_team'
  | 'asset_view_all'
  | 'asset_manage'
  | 'asset_assign'
  | 'vendor_manage'
  | 'subscription_manage'
  | 'purchase_request_create'
  | 'purchase_request_approve'
  | 'asset_finance_manage'
  | 'asset_report_view'

export interface AuthUser {
  id?: number
  username: string
  role: string
  fullName?: string
  permissions?: Permission[]
}

export interface Vendor {
  id: number
  name: string
  taxCode?: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  status: string
}

export type VendorPayload = Omit<Vendor, 'id'>

export interface AssetItem {
  id: number
  assetCode: string
  name: string
  category: string
  serialNumber?: string
  source?: string
  vendor?: Vendor
  assignedEmployeeId?: number
  departmentId?: number
  siteId?: number
  projectId?: number
  purchaseCost?: number
  residualValue?: number
  purchaseDate?: string
  warrantyUntil?: string
  status: string
}

export interface AssetPayload {
  assetCode: string
  name: string
  category: string
  serialNumber?: string
  source?: string
  vendorId?: number | null
  assignedEmployeeId?: number | null
  departmentId?: number | null
  siteId?: number | null
  projectId?: number | null
  purchaseCost?: number | null
  residualValue?: number | null
  purchaseDate?: string
  warrantyUntil?: string
  status?: string
  notes?: string
}

export interface Subscription {
  id: number
  softwareName: string
  planName?: string
  vendor?: Vendor
  totalSeats: number
  usedSeats: number
  cost?: number
  billingCycle?: string
  renewalDate?: string
  status: string
}

export interface SubscriptionPayload {
  softwareName: string
  planName?: string
  vendorId?: number | null
  totalSeats?: number | null
  usedSeats?: number | null
  cost?: number | null
  billingCycle?: string
  startDate?: string
  renewalDate?: string
  status?: string
  notes?: string
}

export interface PurchaseRequest {
  id: number
  requestType: string
  title: string
  reason?: string
  estimatedCost?: number
  requesterEmployeeId?: number
  neededDate?: string
  status: string
}

export interface PurchaseRequestPayload {
  requestType: string
  title: string
  reason?: string
  estimatedCost?: number | null
  requesterEmployeeId?: number | null
  departmentId?: number | null
  siteId?: number | null
  projectId?: number | null
  neededDate?: string
  status?: string
  notes?: string
}

export interface DashboardSummary {
  assets: number
  subscriptions: number
  vendors: number
  purchaseRequests: number
}

export interface EmployeeLite {
  id: number
  fullName?: string
  name?: string
  employeeCode?: string
  departmentName?: string
}

export interface DepartmentLite {
  id: number
  name: string
}

export interface WorkSiteLite {
  id: number
  name: string
  active?: boolean
  defaultSite?: boolean
}

export interface ProjectLite {
  id: number
  name: string
  code?: string
  status?: string
}
