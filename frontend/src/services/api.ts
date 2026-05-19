import axios from 'axios'
import type { AssetItem, AssetPayload, AuthUser, Contract, ContractPayload, DashboardSummary, DepartmentLite, DepreciationSnapshot, DisposeAssetPayload, EmployeeLite, ProjectLite, PurchaseRequest, PurchaseRequestPayload, Subscription, SubscriptionPayload, Vendor, VendorPayload, WorkSiteLite } from './types'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export async function login(username: string, password: string): Promise<AuthUser> {
  const response = await api.post<AuthUser>('/auth/login', { username, password })
  return response.data
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}

export async function loadCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await api.get<AuthUser>('/auth/me')
    return response.data
  } catch {
    return null
  }
}

export async function loadDashboard(): Promise<DashboardSummary> {
  const response = await api.get<DashboardSummary>('/asset/dashboard')
  return response.data
}

export async function loadVendors(): Promise<Vendor[]> {
  const response = await api.get<Vendor[]>('/asset/vendors')
  return response.data
}

export async function createVendor(payload: VendorPayload): Promise<Vendor> {
  const response = await api.post<Vendor>('/asset/vendors', payload)
  return response.data
}

export async function updateVendor(id: number, payload: VendorPayload): Promise<Vendor> {
  const response = await api.put<Vendor>(`/asset/vendors/${id}`, payload)
  return response.data
}

export async function deleteVendor(id: number): Promise<void> {
  await api.delete(`/asset/vendors/${id}`)
}

export async function loadAssets(): Promise<AssetItem[]> {
  const response = await api.get<AssetItem[]>('/asset/assets')
  return response.data
}

export async function createAsset(payload: AssetPayload): Promise<AssetItem> {
  const response = await api.post<AssetItem>('/asset/assets', payload)
  return response.data
}

export async function updateAsset(id: number, payload: AssetPayload): Promise<AssetItem> {
  const response = await api.put<AssetItem>(`/asset/assets/${id}`, payload)
  return response.data
}

export async function deleteAsset(id: number): Promise<void> {
  await api.delete(`/asset/assets/${id}`)
}

export async function loadDepreciation(id: number): Promise<DepreciationSnapshot> {
  const response = await api.get<DepreciationSnapshot>(`/asset/assets/${id}/depreciation`)
  return response.data
}

export async function disposeAsset(id: number, payload: DisposeAssetPayload): Promise<AssetItem> {
  const response = await api.post<AssetItem>(`/asset/assets/${id}/dispose`, payload)
  return response.data
}

export async function loadSubscriptions(): Promise<Subscription[]> {
  const response = await api.get<Subscription[]>('/asset/subscriptions')
  return response.data
}

export async function createSubscription(payload: SubscriptionPayload): Promise<Subscription> {
  const response = await api.post<Subscription>('/asset/subscriptions', payload)
  return response.data
}

export async function updateSubscription(id: number, payload: SubscriptionPayload): Promise<Subscription> {
  const response = await api.put<Subscription>(`/asset/subscriptions/${id}`, payload)
  return response.data
}

export async function deleteSubscription(id: number): Promise<void> {
  await api.delete(`/asset/subscriptions/${id}`)
}

export async function loadPurchaseRequests(): Promise<PurchaseRequest[]> {
  const response = await api.get<PurchaseRequest[]>('/asset/purchase-requests')
  return response.data
}

export async function createPurchaseRequest(payload: PurchaseRequestPayload): Promise<PurchaseRequest> {
  const response = await api.post<PurchaseRequest>('/asset/purchase-requests', payload)
  return response.data
}

export async function updatePurchaseRequest(id: number, payload: PurchaseRequestPayload): Promise<PurchaseRequest> {
  const response = await api.put<PurchaseRequest>(`/asset/purchase-requests/${id}`, payload)
  return response.data
}

export async function updatePurchaseRequestStatus(id: number, status: string): Promise<PurchaseRequest> {
  const response = await api.patch<PurchaseRequest>(`/asset/purchase-requests/${id}/status`, { status })
  return response.data
}

export async function deletePurchaseRequest(id: number): Promise<void> {
  await api.delete(`/asset/purchase-requests/${id}`)
}

export async function loadContracts(): Promise<Contract[]> {
  const response = await api.get<Contract[]>('/asset/contracts')
  return response.data
}

export async function createContract(payload: ContractPayload): Promise<Contract> {
  const response = await api.post<Contract>('/asset/contracts', payload)
  return response.data
}

export async function updateContract(id: number, payload: ContractPayload): Promise<Contract> {
  const response = await api.put<Contract>(`/asset/contracts/${id}`, payload)
  return response.data
}

export async function updateContractStatus(id: number, status: string): Promise<Contract> {
  const response = await api.patch<Contract>(`/asset/contracts/${id}/status`, { status })
  return response.data
}

export async function deleteContract(id: number): Promise<void> {
  await api.delete(`/asset/contracts/${id}`)
}

export async function loadEmployees(): Promise<EmployeeLite[]> {
  const response = await api.get<EmployeeLite[]>('/employees', { params: { page: 0, size: 500 } })
  return response.data
}

export async function loadDepartments(): Promise<DepartmentLite[]> {
  const response = await api.get<DepartmentLite[]>('/employees/departments')
  return response.data
}

export async function loadWorkSites(): Promise<WorkSiteLite[]> {
  const response = await api.get<WorkSiteLite[]>('/work-sites')
  return response.data
}

export async function loadProjects(): Promise<ProjectLite[]> {
  const response = await api.get<ProjectLite[]>('/projects')
  return response.data
}
