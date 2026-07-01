import axios from "axios";
import { getAccessToken } from "../auth/oidc";
import type {
  AssetItem,
  AssetBooking,
  AssetBookingAvailability,
  AssetBookingCancelPayload,
  AssetBookingCheckoutPayload,
  AssetBookingPayload,
  AssetImportCommitPayload,
  AssetImportCommitResponse,
  AssetImportRowPayload,
  AssetImportValidationResponse,
  AssetCategory,
  AssetCategoryPayload,
  AssetCategoryTree,
  AssetPayload,
  AssetTransfer,
  AssetTransferPayload,
  AuthUser,
  Contract,
  ContractPayload,
  DashboardSummary,
  DepartmentLite,
  DepreciationSnapshot,
  DisposeAssetPayload,
  EmployeeLite,
  MaintenanceRecord,
  MaintenanceRecordPayload,
  Permission,
  ProjectLite,
  PurchaseRequest,
  PurchaseRequestPayload,
  Subscription,
  SubscriptionPayload,
  UtilizationReport,
  Vendor,
  VendorPayload,
  WorkSiteLite,
} from "./types";

// Keycloak-only: Authorization: Bearer token is kept in memory.
// The backend also issues XSRF-TOKEN; echo it on mutating same-origin
// requests so Spring Security accepts browser writes even when cookies exist.
export const api = axios.create({
  baseURL: "/api",
  withCredentials: false,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  withXSRFToken: true,
});

// Gắn Bearer token (in-memory) vào mọi request.
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

// FE-410 contract: 410 Gone từ backend → KHÔNG retry → về /login (trang /login tự kích hoạt SSO).
// Single-flight tránh redirect lặp khi nhiều request cùng nhận 410.
let goneHandled = false;
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 410 && !goneHandled) {
      goneHandled = true;
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export async function loadCurrentUser(): Promise<AuthUser | null> {
  try {
    // PA-B: token Keycloak chỉ có role → lấy permissions từ asset-service /asset/me.
    const response = await api.get<{
      username: string;
      role: string;
      employeeId: number | null;
      permissions: Permission[];
    }>("/asset/me");
    const me = response.data;
    return {
      username: me.username,
      role: me.role,
      permissions: me.permissions,
      id: me.employeeId ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function loadDashboard(): Promise<DashboardSummary> {
  const response = await api.get<DashboardSummary>("/asset/dashboard");
  return response.data;
}

export async function loadUtilization(): Promise<UtilizationReport> {
  const response = await api.get<UtilizationReport>("/asset/dashboard/utilization");
  return response.data;
}

export async function loadVendors(): Promise<Vendor[]> {
  const response = await api.get<Vendor[]>("/asset/vendors");
  return response.data;
}

export async function createVendor(payload: VendorPayload): Promise<Vendor> {
  const response = await api.post<Vendor>("/asset/vendors", payload);
  return response.data;
}

export async function updateVendor(id: number, payload: VendorPayload): Promise<Vendor> {
  const response = await api.put<Vendor>(`/asset/vendors/${id}`, payload);
  return response.data;
}

export async function deleteVendor(id: number): Promise<void> {
  await api.delete(`/asset/vendors/${id}`);
}

export async function loadAssets(): Promise<AssetItem[]> {
  const response = await api.get<AssetItem[]>("/asset/assets");
  return response.data;
}

export async function createAsset(payload: AssetPayload): Promise<AssetItem> {
  const response = await api.post<AssetItem>("/asset/assets", payload);
  return response.data;
}

export async function updateAsset(id: number, payload: AssetPayload): Promise<AssetItem> {
  const response = await api.put<AssetItem>(`/asset/assets/${id}`, payload);
  return response.data;
}

export async function deleteAsset(id: number): Promise<void> {
  await api.delete(`/asset/assets/${id}`);
}

export async function validateAssetImport(
  rows: AssetImportRowPayload[],
): Promise<AssetImportValidationResponse> {
  const response = await api.post<AssetImportValidationResponse>("/asset/assets/import/validate", {
    rows,
  });
  return response.data;
}

export async function commitAssetImport(
  payload: AssetImportCommitPayload,
): Promise<AssetImportCommitResponse> {
  const response = await api.post<AssetImportCommitResponse>("/asset/assets/import", payload);
  return response.data;
}

export async function loadAssetCategories(): Promise<AssetCategory[]> {
  const response = await api.get<AssetCategory[]>("/asset/categories");
  return response.data;
}

export async function loadAssetCategoryTree(): Promise<AssetCategoryTree[]> {
  const response = await api.get<AssetCategoryTree[]>("/asset/categories/tree");
  return response.data;
}

export async function createAssetCategory(
  payload: AssetCategoryPayload,
): Promise<AssetCategory> {
  const response = await api.post<AssetCategory>("/asset/categories", payload);
  return response.data;
}

export async function updateAssetCategory(
  id: number,
  payload: AssetCategoryPayload,
): Promise<AssetCategory> {
  const response = await api.put<AssetCategory>(`/asset/categories/${id}`, payload);
  return response.data;
}

export async function deleteAssetCategory(id: number): Promise<void> {
  await api.delete(`/asset/categories/${id}`);
}

export async function loadDepreciation(id: number): Promise<DepreciationSnapshot> {
  const response = await api.get<DepreciationSnapshot>(`/asset/assets/${id}/depreciation`);
  return response.data;
}

export async function disposeAsset(id: number, payload: DisposeAssetPayload): Promise<AssetItem> {
  const response = await api.post<AssetItem>(`/asset/assets/${id}/dispose`, payload);
  return response.data;
}

export async function loadSubscriptions(): Promise<Subscription[]> {
  const response = await api.get<Subscription[]>("/asset/subscriptions");
  return response.data;
}

export async function createSubscription(payload: SubscriptionPayload): Promise<Subscription> {
  const response = await api.post<Subscription>("/asset/subscriptions", payload);
  return response.data;
}

export async function updateSubscription(
  id: number,
  payload: SubscriptionPayload,
): Promise<Subscription> {
  const response = await api.put<Subscription>(`/asset/subscriptions/${id}`, payload);
  return response.data;
}

export async function deleteSubscription(id: number): Promise<void> {
  await api.delete(`/asset/subscriptions/${id}`);
}

export async function loadPurchaseRequests(): Promise<PurchaseRequest[]> {
  const response = await api.get<PurchaseRequest[]>("/asset/purchase-requests");
  return response.data;
}

export async function createPurchaseRequest(
  payload: PurchaseRequestPayload,
): Promise<PurchaseRequest> {
  const response = await api.post<PurchaseRequest>("/asset/purchase-requests", payload);
  return response.data;
}

export async function updatePurchaseRequest(
  id: number,
  payload: PurchaseRequestPayload,
): Promise<PurchaseRequest> {
  const response = await api.put<PurchaseRequest>(`/asset/purchase-requests/${id}`, payload);
  return response.data;
}

export async function updatePurchaseRequestStatus(
  id: number,
  status: string,
): Promise<PurchaseRequest> {
  const response = await api.patch<PurchaseRequest>(`/asset/purchase-requests/${id}/status`, {
    status,
  });
  return response.data;
}

export async function deletePurchaseRequest(id: number): Promise<void> {
  await api.delete(`/asset/purchase-requests/${id}`);
}

export async function loadContracts(): Promise<Contract[]> {
  const response = await api.get<Contract[]>("/asset/contracts");
  return response.data;
}

export async function createContract(payload: ContractPayload): Promise<Contract> {
  const response = await api.post<Contract>("/asset/contracts", payload);
  return response.data;
}

export async function updateContract(id: number, payload: ContractPayload): Promise<Contract> {
  const response = await api.put<Contract>(`/asset/contracts/${id}`, payload);
  return response.data;
}

export async function updateContractStatus(id: number, status: string): Promise<Contract> {
  const response = await api.patch<Contract>(`/asset/contracts/${id}/status`, { status });
  return response.data;
}

export async function deleteContract(id: number): Promise<void> {
  await api.delete(`/asset/contracts/${id}`);
}

export async function loadMaintenanceRecords(): Promise<MaintenanceRecord[]> {
  const response = await api.get<MaintenanceRecord[]>("/asset/maintenance");
  return response.data;
}

export async function createMaintenanceRecord(
  payload: MaintenanceRecordPayload,
): Promise<MaintenanceRecord> {
  const response = await api.post<MaintenanceRecord>("/asset/maintenance", payload);
  return response.data;
}

export async function updateMaintenanceRecord(
  id: number,
  payload: MaintenanceRecordPayload,
): Promise<MaintenanceRecord> {
  const response = await api.put<MaintenanceRecord>(`/asset/maintenance/${id}`, payload);
  return response.data;
}

export async function deleteMaintenanceRecord(id: number): Promise<void> {
  await api.delete(`/asset/maintenance/${id}`);
}

export async function loadWarrantyExpiring(days: number = 30): Promise<AssetItem[]> {
  const response = await api.get<AssetItem[]>(`/asset/maintenance/warranty-expiring`, {
    params: { days },
  });
  return response.data;
}

export async function loadTransfers(): Promise<AssetTransfer[]> {
  const response = await api.get<AssetTransfer[]>("/asset/transfers");
  return response.data;
}

export async function createTransfer(payload: AssetTransferPayload): Promise<AssetTransfer> {
  const response = await api.post<AssetTransfer>("/asset/transfers", payload);
  return response.data;
}

export async function deleteTransfer(id: number): Promise<void> {
  await api.delete(`/asset/transfers/${id}`);
}

export async function loadAssetBookings(params?: {
  assetId?: number;
  status?: string;
  fromTime?: string;
  toTime?: string;
}): Promise<AssetBooking[]> {
  const response = await api.get<AssetBooking[]>("/asset/bookings", { params });
  return response.data;
}

export async function checkAssetBookingAvailability(params: {
  assetCode: string;
  startTime: string;
  endTime: string;
}): Promise<AssetBookingAvailability> {
  const response = await api.get<AssetBookingAvailability>("/asset/bookings/availability", {
    params,
  });
  return response.data;
}

export async function createAssetBooking(payload: AssetBookingPayload): Promise<AssetBooking> {
  const response = await api.post<AssetBooking>("/asset/bookings", payload);
  return response.data;
}

export async function checkInAssetBooking(id: number): Promise<AssetBooking> {
  const response = await api.post<AssetBooking>(`/asset/bookings/${id}/check-in`);
  return response.data;
}

export async function checkOutAssetBooking(
  id: number,
  payload: AssetBookingCheckoutPayload,
): Promise<AssetBooking> {
  const response = await api.post<AssetBooking>(`/asset/bookings/${id}/check-out`, payload);
  return response.data;
}

export async function cancelAssetBooking(
  id: number,
  payload: AssetBookingCancelPayload,
): Promise<AssetBooking> {
  const response = await api.post<AssetBooking>(`/asset/bookings/${id}/cancel`, payload);
  return response.data;
}

export async function loadEmployees(): Promise<EmployeeLite[]> {
  const response = await api.get<EmployeeLite[]>("/employees", { params: { page: 0, size: 500 } });
  return response.data;
}

export async function loadDepartments(): Promise<DepartmentLite[]> {
  const response = await api.get<DepartmentLite[]>("/employees/departments");
  return response.data;
}

export async function loadWorkSites(): Promise<WorkSiteLite[]> {
  const response = await api.get<WorkSiteLite[]>("/work-sites");
  return response.data;
}

export async function loadProjects(): Promise<ProjectLite[]> {
  const response = await api.get<ProjectLite[]>("/projects");
  return response.data;
}
