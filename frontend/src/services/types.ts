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
  | 'contract_manage'
  | 'maintenance_manage'
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
  depreciationMethod?: string
  usefulLifeYears?: number
  disposalDate?: string
  disposalPrice?: number
  disposalReason?: string
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
  depreciationMethod?: string
  usefulLifeYears?: number | null
  notes?: string
}

export interface DepreciationSnapshot {
  assetId: number
  method: string
  usefulLifeYears?: number
  purchaseCost: number
  residualValue: number
  annualDepreciation: number
  accumulatedDepreciation: number
  bookValue: number
  yearsElapsed: number
}

export interface DisposeAssetPayload {
  disposalDate: string
  disposalPrice?: number | null
  disposalReason?: string
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

export interface Contract {
  id: number
  contractNumber: string
  title: string
  vendor?: Vendor
  purchaseRequest?: PurchaseRequest
  signDate?: string
  effectiveFrom?: string
  effectiveTo?: string
  contractValue?: number
  currency?: string
  paymentTerms?: string
  status: string
  attachmentUrl?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface ContractPayload {
  contractNumber: string
  title: string
  vendorId?: number | null
  purchaseRequestId?: number | null
  signDate?: string
  effectiveFrom?: string
  effectiveTo?: string
  contractValue?: number | null
  currency?: string
  paymentTerms?: string
  status?: string
  attachmentUrl?: string
  notes?: string
}

export interface DashboardSummary {
  assets: number
  subscriptions: number
  vendors: number
  purchaseRequests: number
  contracts: number
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

export interface MaintenanceRecord {
  id: number
  asset: AssetItem
  maintenanceType: string
  maintenanceDate: string
  cost?: number
  vendor?: Vendor
  performedBy?: string
  description?: string
  nextMaintenanceDate?: string
  status: string
}

export interface MaintenanceRecordPayload {
  assetId: number
  maintenanceType: string
  maintenanceDate: string
  cost?: number | null
  vendorId?: number | null
  performedBy?: string
  description?: string
  nextMaintenanceDate?: string
  status?: string
}

export interface AssetTransfer {
  id: number
  asset: AssetItem
  transferType: string
  fromEmployeeId?: number
  toEmployeeId?: number
  fromDepartmentId?: number
  toDepartmentId?: number
  fromSiteId?: number
  toSiteId?: number
  transferDate: string
  reason?: string
  performedBy?: string
  handoverDocumentUrl?: string
  createdAt?: string
}

export interface AssetTransferPayload {
  assetId: number
  transferType: string
  fromEmployeeId?: number | null
  toEmployeeId?: number | null
  fromDepartmentId?: number | null
  toDepartmentId?: number | null
  fromSiteId?: number | null
  toSiteId?: number | null
  transferDate: string
  reason?: string
  performedBy?: string
  handoverDocumentUrl?: string
  applyToAsset?: boolean
}

export interface UtilizationReport {
  totalAssets: number
  assignedAssets: number
  idleAssets: number
  maintenanceAssets: number
  disposedAssets: number
  utilizationRate: number
  totalPurchaseValue: number
  totalIdleValue: number
  byStatus: Record<string, number>
  byCategory: Record<string, number>
}
