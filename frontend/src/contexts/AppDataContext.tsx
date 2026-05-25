import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  loadAssets,
  loadContracts,
  loadDashboard,
  loadDepartments,
  loadEmployees,
  loadMaintenanceRecords,
  loadProjects,
  loadPurchaseRequests,
  loadSubscriptions,
  loadTransfers,
  loadUtilization,
  loadVendors,
  loadWorkSites,
} from '../services/api'
import type {
  AssetItem,
  AssetTransfer,
  Contract,
  DashboardSummary,
  DepartmentLite,
  EmployeeLite,
  MaintenanceRecord,
  ProjectLite,
  PurchaseRequest,
  Subscription,
  UtilizationReport,
  Vendor,
  WorkSiteLite,
} from '../services/types'
import { useAuth } from './AuthContext'

interface AppDataContextValue {
  summary: DashboardSummary
  assets: AssetItem[]
  subscriptions: Subscription[]
  vendors: Vendor[]
  requests: PurchaseRequest[]
  contracts: Contract[]
  maintenanceRecords: MaintenanceRecord[]
  transfers: AssetTransfer[]
  utilization: UtilizationReport | null
  employees: EmployeeLite[]
  departments: DepartmentLite[]
  workSites: WorkSiteLite[]
  projects: ProjectLite[]
  loading: boolean
  error: string
  refresh: () => Promise<void>
  clearError: () => void
  setError: (message: string) => void
}

const emptySummary: DashboardSummary = { assets: 0, subscriptions: 0, vendors: 0, purchaseRequests: 0, contracts: 0 }

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary)
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([])
  const [transfers, setTransfers] = useState<AssetTransfer[]>([])
  const [utilization, setUtilization] = useState<UtilizationReport | null>(null)
  const [employees, setEmployees] = useState<EmployeeLite[]>([])
  const [departments, setDepartments] = useState<DepartmentLite[]>([])
  const [workSites, setWorkSites] = useState<WorkSiteLite[]>([])
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setErrorState] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setErrorState('')
    try {
      // Parallel fetch with per-call defaults — a single 401 from any endpoint
      // shouldn't blank the entire page; the others still hydrate.
      const [
        dashboardData,
        vendorData,
        assetData,
        subscriptionData,
        requestData,
        contractData,
        maintenanceData,
        transferData,
        utilizationData,
        employeeData,
        departmentData,
        siteData,
        projectData,
      ] = await Promise.all([
        loadDashboard().catch(() => emptySummary),
        loadVendors().catch(() => []),
        loadAssets().catch(() => []),
        loadSubscriptions().catch(() => []),
        loadPurchaseRequests().catch(() => []),
        loadContracts().catch(() => []),
        loadMaintenanceRecords().catch(() => []),
        loadTransfers().catch(() => []),
        loadUtilization().catch(() => null),
        loadEmployees().catch(() => []),
        loadDepartments().catch(() => []),
        loadWorkSites().catch(() => []),
        loadProjects().catch(() => []),
      ])
      setSummary(dashboardData)
      setVendors(vendorData)
      setAssets(assetData)
      setSubscriptions(subscriptionData)
      setRequests(requestData)
      setContracts(contractData)
      setMaintenanceRecords(maintenanceData)
      setTransfers(transferData)
      setUtilization(utilizationData)
      setEmployees(employeeData)
      setDepartments(departmentData)
      setWorkSites(siteData)
      setProjects(projectData)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      // Logout — clear sensitive caches.
      setAssets([])
      setSubscriptions([])
      setVendors([])
      setRequests([])
      setContracts([])
      setMaintenanceRecords([])
      setTransfers([])
      setSummary(emptySummary)
      setUtilization(null)
      return
    }
    void refresh()
  }, [user, refresh])

  const clearError = useCallback(() => setErrorState(''), [])
  const setError = useCallback((message: string) => setErrorState(message), [])

  const value = useMemo<AppDataContextValue>(
    () => ({
      summary,
      assets,
      subscriptions,
      vendors,
      requests,
      contracts,
      maintenanceRecords,
      transfers,
      utilization,
      employees,
      departments,
      workSites,
      projects,
      loading,
      error,
      refresh,
      clearError,
      setError,
    }),
    [
      summary,
      assets,
      subscriptions,
      vendors,
      requests,
      contracts,
      maintenanceRecords,
      transfers,
      utilization,
      employees,
      departments,
      workSites,
      projects,
      loading,
      error,
      refresh,
      clearError,
      setError,
    ],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>')
  return ctx
}
