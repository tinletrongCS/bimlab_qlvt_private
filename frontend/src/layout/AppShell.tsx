import { type ReactElement, useMemo } from "react";
import {
  FiBarChart2,
  FiBox,
  FiBriefcase,
  FiCreditCard,
  FiFileText,
  FiLogOut,
  FiRefreshCw,
  FiRepeat,
  FiShield,
  FiShoppingCart,
  FiTool,
} from "react-icons/fi";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { CrudForm } from "../components/forms/CrudForm";
import { useActions } from "../contexts/ActionsContext";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import type { Permission } from "../services/types";

interface NavItem {
  to: string;
  label: string;
  icon: ReactElement;
  permission?: Permission;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Tổng quan", icon: <FiBarChart2 />, permission: "asset_report_view" },
  { to: "/assets", label: "Tài sản", icon: <FiBox />, permission: "asset_access" },
  {
    to: "/subscriptions",
    label: "Subscription",
    icon: <FiCreditCard />,
    permission: "subscription_manage",
  },
  { to: "/vendors", label: "Nhà cung cấp", icon: <FiBriefcase />, permission: "vendor_manage" },
  {
    to: "/requests",
    label: "Đề nghị mua sắm",
    icon: <FiShoppingCart />,
    permission: "purchase_request_create",
  },
  { to: "/contracts", label: "Hợp đồng", icon: <FiFileText />, permission: "contract_manage" },
  { to: "/maintenance", label: "Bảo trì", icon: <FiTool />, permission: "maintenance_manage" },
  { to: "/transfers", label: "Luân chuyển", icon: <FiRepeat />, permission: "asset_manage" },
];

export function AppShell() {
  const { user, logout, hasPermission, submitting: authSubmitting } = useAuth();
  const { loading, error, refresh } = useAppData();
  const { submitting: actionSubmitting } = useActions();
  const location = useLocation();

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => hasPermission(item.permission)),
    [hasPermission],
  );
  const currentLabel = useMemo(() => {
    const match = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
    return match?.label || "QLVT";
  }, [location.pathname]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="https://bimlab.com.vn/assets/img/bimlab-logo.png" alt="BIMLab" />
          <p>Quản lý vật tư</p>
        </div>
        <nav>
          {visibleItems.map((item) => (
            <NavLink
              to={item.to}
              key={item.to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="user-card">
          <FiShield />
          <div>
            <strong>{user?.fullName || user?.username}</strong>
            <span>{user?.role}</span>
          </div>
          <button
            type="button"
            className="logout-button"
            onClick={() => void logout()}
            disabled={authSubmitting}
            title="Đăng xuất"
          >
            <FiLogOut />
          </button>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Giai đoạn 4</p>
            <h1>{currentLabel}</h1>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => void refresh()}
            disabled={loading || actionSubmitting}
          >
            <FiRefreshCw /> Làm mới
          </button>
        </header>
        {error && <div className="alert">{error}</div>}
        {loading ? <div className="loading">Đang tải dữ liệu...</div> : <Outlet />}
      </section>

      <CrudForm />
    </main>
  );
}
