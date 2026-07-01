import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
} from "../services/api";
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
} from "../services/types";
import { useAuth } from "./AuthContext";

type DataKey =
  | "summary"
  | "assets"
  | "subscriptions"
  | "vendors"
  | "requests"
  | "contracts"
  | "maintenance"
  | "transfers"
  | "utilization"
  | "employees"
  | "departments"
  | "workSites"
  | "projects";

interface AppDataContextValue {
  summary: DashboardSummary;
  assets: AssetItem[];
  subscriptions: Subscription[];
  vendors: Vendor[];
  requests: PurchaseRequest[];
  contracts: Contract[];
  maintenanceRecords: MaintenanceRecord[];
  transfers: AssetTransfer[];
  utilization: UtilizationReport | null;
  employees: EmployeeLite[];
  departments: DepartmentLite[];
  workSites: WorkSiteLite[];
  projects: ProjectLite[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  ensureDashboard: () => Promise<void>;
  ensureAssets: (force?: boolean) => Promise<void>;
  ensureVendors: () => Promise<void>;
  ensureSubscriptions: () => Promise<void>;
  ensureRequests: () => Promise<void>;
  ensureContracts: () => Promise<void>;
  ensureMaintenance: () => Promise<void>;
  ensureTransfers: () => Promise<void>;
  ensureLookups: () => Promise<void>;
  ensureAssetDetailLookups: () => Promise<void>;
  clearError: () => void;
  setError: (message: string) => void;
}

const emptySummary: DashboardSummary = {
  assets: 0,
  subscriptions: 0,
  vendors: 0,
  purchaseRequests: 0,
  contracts: 0,
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const loadedRef = useRef(new Set<DataKey>());
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [transfers, setTransfers] = useState<AssetTransfer[]>([]);
  const [utilization, setUtilization] = useState<UtilizationReport | null>(null);
  const [employees, setEmployees] = useState<EmployeeLite[]>([]);
  const [departments, setDepartments] = useState<DepartmentLite[]>([]);
  const [workSites, setWorkSites] = useState<WorkSiteLite[]>([]);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setErrorState] = useState("");

  useEffect(() => {
    if (user) return;
    loadedRef.current.clear();
    setSummary(emptySummary);
    setAssets([]);
    setSubscriptions([]);
    setVendors([]);
    setRequests([]);
    setContracts([]);
    setMaintenanceRecords([]);
    setTransfers([]);
    setUtilization(null);
    setEmployees([]);
    setDepartments([]);
    setWorkSites([]);
    setProjects([]);
    setLoading(false);
    setErrorState("");
  }, [user]);

  const loadKeys = useCallback(async (keys: DataKey[], force = false, silent = false) => {
    const uniqueKeys = Array.from(new Set(keys));
    const pendingKeys = force
      ? uniqueKeys
      : uniqueKeys.filter((key) => !loadedRef.current.has(key));
    if (pendingKeys.length === 0) return;

    if (!silent) {
      setLoading(true);
      setErrorState("");
    }
    try {
      await Promise.all(
        pendingKeys.map(async (key) => {
          if (key === "summary") setSummary(await loadDashboard().catch(() => emptySummary));
          if (key === "assets") setAssets(await loadAssets().catch(() => []));
          if (key === "subscriptions") setSubscriptions(await loadSubscriptions().catch(() => []));
          if (key === "vendors") setVendors(await loadVendors().catch(() => []));
          if (key === "requests") setRequests(await loadPurchaseRequests().catch(() => []));
          if (key === "contracts") setContracts(await loadContracts().catch(() => []));
          if (key === "maintenance")
            setMaintenanceRecords(await loadMaintenanceRecords().catch(() => []));
          if (key === "transfers") setTransfers(await loadTransfers().catch(() => []));
          if (key === "utilization") setUtilization(await loadUtilization().catch(() => null));
          if (key === "employees") setEmployees(await loadEmployees().catch(() => []));
          if (key === "departments") setDepartments(await loadDepartments().catch(() => []));
          if (key === "workSites") setWorkSites(await loadWorkSites().catch(() => []));
          if (key === "projects") setProjects(await loadProjects().catch(() => []));
          loadedRef.current.add(key);
        }),
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const ensureLookups = useCallback(
    () => loadKeys(["vendors", "employees", "departments", "workSites", "projects"]),
    [loadKeys],
  );

  const ensureAssetDetailLookups = useCallback(
    () => loadKeys(["employees", "departments", "workSites", "projects"], false, true),
    [loadKeys],
  );

  const ensureDashboard = useCallback(
    () => loadKeys(["summary", "assets", "subscriptions", "vendors", "requests", "utilization"]),
    [loadKeys],
  );

  const ensureAssets = useCallback(
    (force = false) =>
      loadKeys(
        force ? ["assets"] : ["assets", "employees", "departments", "workSites"],
        force,
      ),
    [loadKeys],
  );

  const ensureVendors = useCallback(() => loadKeys(["vendors"]), [loadKeys]);
  const ensureSubscriptions = useCallback(() => loadKeys(["subscriptions", "vendors"]), [loadKeys]);
  const ensureRequests = useCallback(() => loadKeys(["requests"]), [loadKeys]);
  const ensureContracts = useCallback(() => loadKeys(["contracts", "vendors"]), [loadKeys]);
  const ensureMaintenance = useCallback(
    () => loadKeys(["maintenance", "assets", "vendors"]),
    [loadKeys],
  );
  const ensureTransfers = useCallback(
    () => loadKeys(["transfers", "employees", "assets", "departments", "workSites"]),
    [loadKeys],
  );

  const refresh = useCallback(async () => {
    const loadedKeys = Array.from(loadedRef.current);
    if (loadedKeys.length === 0) {
      await ensureDashboard();
      return;
    }
    await loadKeys(loadedKeys, true);
  }, [ensureDashboard, loadKeys]);

  const clearError = useCallback(() => setErrorState(""), []);
  const setError = useCallback((message: string) => setErrorState(message), []);

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
      ensureDashboard,
      ensureAssets,
      ensureVendors,
      ensureSubscriptions,
      ensureRequests,
      ensureContracts,
      ensureMaintenance,
      ensureTransfers,
      ensureLookups,
      ensureAssetDetailLookups,
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
      ensureDashboard,
      ensureAssets,
      ensureVendors,
      ensureSubscriptions,
      ensureRequests,
      ensureContracts,
      ensureMaintenance,
      ensureTransfers,
      ensureLookups,
      ensureAssetDetailLookups,
      clearError,
      setError,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside <AppDataProvider>");
  return ctx;
}
