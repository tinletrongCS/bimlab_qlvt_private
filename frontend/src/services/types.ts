// Mirrors backend Permission enum (QLVT/asset-service/.../security/Permission.java).
// Q1.5: removed FE-only `asset_assign` — no BE endpoint enforces it; remove drift.
export type Permission =
  | "asset_access"
  | "asset_view_self"
  | "asset_view_team"
  | "asset_view_all"
  | "asset_manage"
  | "vendor_manage"
  | "subscription_manage"
  | "purchase_request_create"
  | "purchase_request_approve"
  | "contract_manage"
  | "maintenance_manage"
  | "asset_finance_manage"
  | "asset_finance_view"
  | "asset_report_view";

export interface AuthUser {
  id?: number;
  username: string;
  role: string;
  fullName?: string;
  permissions?: Permission[];
  mfaEnabled?: boolean;
}

export interface AuthLoginResponse extends Partial<AuthUser> {
  token?: string;
  refreshToken?: string;
  mfaRequired?: boolean;
  mfaChallengeId?: string;
  message?: string;
}

export interface Vendor {
  id: number;
  name: string;
  taxCode?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: string;
}

export type VendorPayload = Omit<Vendor, "id">;

export interface AssetSummary {
  id: number;
  assetCode: string;
  name: string;
}

export interface AssetCatalogItem {
  id: number;
  itemCode: string;
  name: string;
  category?: AssetCategory | null;
}

export interface AssetItem {
  id: number;
  assetCode: string;
  name: string;
  catalogItem?: AssetCatalogItem | null;
  assetCategory?: AssetCategory | null;
  category: string;
  parentAsset?: AssetSummary | null;
  assetClass?: string;
  fixedAssetType?: string;
  toolUsageType?: string;
  serialNumber?: string;
  source?: string;
  vendor?: Vendor;
  assignedEmployeeId?: number;
  departmentId?: number;
  siteId?: number;
  projectId?: number;
  useDate?: string;
  depreciationStartDate?: string;
  originalCost?: number;
  purchaseCost?: number;
  accumulatedDepreciation?: number;
  bookValue?: number;
  residualValue?: number;
  purchaseDate?: string;
  warrantyUntil?: string;
  status: string;
  depreciationMethod?: string;
  usefulLifeMonths?: number;
  usefulLifeYears?: number;
  depreciationRate?: number;
  manufactureYear?: number;
  installationYear?: number;
  countryCode?: string;
  capacity?: number;
  capacityUnit?: string;
  realCapacity?: number;
  technicalDescription?: string;
  disposalDate?: string;
  disposalPrice?: number;
  disposalReason?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetCategory {
  id: number;
  code: string;
  name: string;
  assetClass: "FIXED_ASSET" | "TOOL_EQUIPMENT" | string;
  parentId?: number | null;
  description?: string;
  active: boolean;
}

export interface AssetCategoryTree extends AssetCategory {
  children: AssetCategoryTree[];
}

export interface AssetCategoryPayload {
  code: string;
  name: string;
  parentId?: number | null;
  assetClass: "FIXED_ASSET" | "TOOL_EQUIPMENT" | string;
  description?: string;
  active: boolean;
}

export interface AssetCategoryImportRowPayload {
  rowNumber: number;
  group?: string;
  code?: string;
  name?: string;
  parentCode?: string;
}

export interface AssetCategoryImportMessage {
  field?: string;
  code: string;
  message: string;
}

export interface AssetCategoryImportRowResult {
  rowNumber: number;
  status: "PENDING" | "VALID" | "INVALID" | "WARNING" | string;
  code: string;
  name: string;
  parentCode?: string;
  action: "PENDING" | "CREATE" | "UPDATE" | "SKIP" | string;
  errors: AssetCategoryImportMessage[];
  warnings: AssetCategoryImportMessage[];
}

export interface AssetCategoryImportValidationResponse {
  uploadStatus: "PENDING" | "VALID" | "HAS_ERROR" | string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  rows: AssetCategoryImportRowResult[];
}

export interface AssetCategoryImportCommitPayload {
  rows: AssetCategoryImportRowPayload[];
}

export interface AssetCategoryImportCommitResponse {
  uploadStatus: "IMPORTED" | "PARTIALLY_IMPORTED" | "FAILED" | string;
  importedRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  rows: AssetCategoryImportRowResult[];
}

export interface AssetPayload {
  assetCode: string;
  name: string;
  category: string;
  serialNumber?: string;
  source?: string;
  vendorId?: number | null;
  assignedEmployeeId?: number | null;
  departmentId?: number | null;
  siteId?: number | null;
  projectId?: number | null;
  purchaseCost?: number | null;
  residualValue?: number | null;
  purchaseDate?: string;
  warrantyUntil?: string;
  status?: string;
  depreciationMethod?: string;
  usefulLifeYears?: number | null;
  notes?: string;
  catalogItemId?: number | null;
  categoryId?: number | null;
  parentAssetId?: number | null;
  assetClass?: string;
  fixedAssetType?: string;
  toolUsageType?: string;
  useDate?: string;
  depreciationStartDate?: string;
  originalCost?: number | null;
  accumulatedDepreciation?: number | null;
  bookValue?: number | null;
  usefulLifeMonths?: number | null;
  depreciationRate?: number | null;
  manufactureYear?: number | null;
  installationYear?: number | null;
  countryCode?: string;
  capacity?: number | null;
  capacityUnit?: string;
  realCapacity?: number | null;
  technicalDescription?: string;
}

export interface AssetImportRowPayload {
  rowNumber: number;
  assetCode?: string;
  name?: string;
  assetClass?: string;
  classType?: string;
  categoryCode?: string;
  departmentName?: string;
  siteName?: string;
  catalogItemCode?: string;
  depreciationMethod?: string;
  serialNumber?: string;
  depreciationStartDate?: string;
  useDate?: string;
  usefulLifeMonths?: number | null;
  originalCost?: number | null;
  bookValue?: number | null;
  status?: string;
  countryCode?: string;
  manufactureYear?: number | null;
  installationYear?: number | null;
  technicalDescription?: string;
}

export interface AssetImportMessage {
  field?: string;
  code: string;
  message: string;
}

export interface AssetImportRowResult {
  rowNumber: number;
  status: "VALID" | "INVALID" | "WARNING" | "IMPORTED" | "SKIPPED" | string;
  assetName?: string;
  categoryCode?: string;
  generatedAssetCodePreview?: string | null;
  errors: AssetImportMessage[];
  warnings: AssetImportMessage[];
}

export interface AssetImportValidationResponse {
  uploadStatus: "VALID" | "HAS_ERROR" | "IMPORTED" | "PARTIALLY_IMPORTED" | "FAILED" | string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  rows: AssetImportRowResult[];
}

export interface AssetImportCommitPayload {
  importMode: "ALL_OR_NOTHING" | "VALID_ROWS_ONLY";
  rows: AssetImportRowPayload[];
}

export interface AssetImportCommitResponse {
  uploadStatus: "IMPORTED" | "PARTIALLY_IMPORTED" | "FAILED" | string;
  importedRows: number;
  skippedRows: number;
  errorRows: number;
  rows: AssetImportRowResult[];
}

export interface DepreciationSnapshot {
  assetId: number;
  method: string;
  usefulLifeYears?: number;
  purchaseCost: number;
  residualValue: number;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
  yearsElapsed: number;
}

export interface DisposeAssetPayload {
  disposalDate: string;
  disposalPrice?: number | null;
  disposalReason?: string;
}

export interface Subscription {
  id: number;
  softwareName: string;
  planName?: string;
  vendor?: Vendor;
  totalSeats: number;
  usedSeats: number;
  cost?: number;
  billingCycle?: string;
  renewalDate?: string;
  status: string;
}

export interface SubscriptionPayload {
  softwareName: string;
  planName?: string;
  vendorId?: number | null;
  totalSeats?: number | null;
  usedSeats?: number | null;
  cost?: number | null;
  billingCycle?: string;
  startDate?: string;
  renewalDate?: string;
  status?: string;
  notes?: string;
}

export interface PurchaseRequest {
  id: number;
  requestType: string;
  title: string;
  reason?: string;
  estimatedCost?: number;
  requesterEmployeeId?: number;
  neededDate?: string;
  status: string;
}

export interface PurchaseRequestPayload {
  requestType: string;
  title: string;
  reason?: string;
  estimatedCost?: number | null;
  requesterEmployeeId?: number | null;
  departmentId?: number | null;
  siteId?: number | null;
  projectId?: number | null;
  neededDate?: string;
  status?: string;
  notes?: string;
}

export interface Contract {
  id: number;
  contractNumber: string;
  title: string;
  vendor?: Vendor;
  purchaseRequest?: PurchaseRequest;
  signDate?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  contractValue?: number;
  currency?: string;
  paymentTerms?: string;
  status: string;
  attachmentUrl?: string;
  // Q7: prefer attachmentObjectKey; attachmentUrl deprecated, kept for back-compat
  attachmentObjectKey?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContractPayload {
  contractNumber: string;
  title: string;
  vendorId?: number | null;
  purchaseRequestId?: number | null;
  signDate?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  contractValue?: number | null;
  currency?: string;
  paymentTerms?: string;
  status?: string;
  attachmentUrl?: string;
  // Q7: prefer attachmentObjectKey; attachmentUrl deprecated, kept for back-compat
  attachmentObjectKey?: string;
  notes?: string;
}

export interface DashboardSummary {
  assets: number;
  subscriptions: number;
  vendors: number;
  purchaseRequests: number;
  contracts: number;
}

export interface EmployeeLite {
  id: number;
  fullName?: string;
  name?: string;
  employeeCode?: string;
  departmentName?: string;
}

export interface DepartmentLite {
  id: number;
  name: string;
}

export interface WorkSiteLite {
  id: number;
  name: string;
  active?: boolean;
  defaultSite?: boolean;
}

export interface ProjectLite {
  id: number;
  name: string;
  code?: string;
  status?: string;
}

export interface MaintenanceRecord {
  id: number;
  asset: AssetItem;
  maintenanceType: string;
  maintenanceDate: string;
  cost?: number;
  vendor?: Vendor;
  performedBy?: string;
  description?: string;
  nextMaintenanceDate?: string;
  status: string;
}

export interface MaintenanceRecordPayload {
  assetId: number;
  maintenanceType: string;
  maintenanceDate: string;
  cost?: number | null;
  vendorId?: number | null;
  performedBy?: string;
  description?: string;
  nextMaintenanceDate?: string;
  status?: string;
}

export interface AssetTransfer {
  id: number;
  asset: AssetItem;
  transferType: string;
  fromEmployeeId?: number;
  toEmployeeId?: number;
  fromDepartmentId?: number;
  toDepartmentId?: number;
  fromSiteId?: number;
  toSiteId?: number;
  transferDate: string;
  reason?: string;
  performedBy?: string;
  handoverDocumentUrl?: string;
  createdAt?: string;
}

export interface AssetTransferPayload {
  assetId: number;
  transferType: string;
  fromEmployeeId?: number | null;
  toEmployeeId?: number | null;
  fromDepartmentId?: number | null;
  toDepartmentId?: number | null;
  fromSiteId?: number | null;
  toSiteId?: number | null;
  transferDate: string;
  reason?: string;
  performedBy?: string;
  handoverDocumentUrl?: string;
  applyToAsset?: boolean;
}

export type AssetBookingStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "CONFIRMED"
  | "IN_USE"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED"
  | string;

export interface AssetBooking {
  id: number;
  assetId: number;
  assetCode?: string;
  assetName?: string;
  bookingCode: string;
  title: string;
  purpose?: string;
  startTime: string;
  endTime: string;
  requestedByEmployeeId?: number;
  departmentId?: number;
  siteId?: number;
  projectId?: number;
  status: AssetBookingStatus;
  autoRelease: boolean;
  checkedInAt?: string;
  checkedOutAt?: string;
  approvedBy?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancelReason?: string;
  notes?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetBookingPayload {
  assetCode: string;
  title: string;
  purpose?: string;
  startTime: string;
  endTime: string;
  requestedByEmployeeId?: number | null;
  departmentId?: number | null;
  siteId?: number | null;
  projectId?: number | null;
  autoRelease?: boolean;
  notes?: string;
  createdBy?: string;
}

export interface AssetBookingAvailability {
  assetId: number;
  assetCode: string;
  startTime: string;
  endTime: string;
  available: boolean;
  reason?: string;
  conflictingBookingId?: number;
  conflictingBookingCode?: string;
}

export interface AssetBookingCancelPayload {
  cancelledBy: string;
  cancelReason: string;
}

export interface AssetBookingCheckoutPayload {
  completedBy?: string;
  notes?: string;
}

export interface UtilizationReport {
  totalAssets: number;
  assignedAssets: number;
  idleAssets: number;
  maintenanceAssets: number;
  disposedAssets: number;
  utilizationRate: number;
  totalPurchaseValue: number;
  totalIdleValue: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
}
