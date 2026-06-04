import { type ReactElement, useMemo, useState } from "react";
import {
  FiBarChart2,
  FiBox,
  FiBriefcase,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiFileText,
  FiLogOut,
  FiMenu,
  FiRefreshCw,
  FiRepeat,
  FiSearch,
  FiShoppingCart,
  FiTool,
  FiX,
} from "react-icons/fi";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { CrudForm } from "../components/forms/CrudForm";
import { UserAvatar } from "../components/UserAvatar";
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

interface NavGroup {
  key: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: "dashboard",
    items: [
      {
        to: "/dashboard",
        label: "Tổng quan",
        icon: <FiBarChart2 />,
        permission: "asset_report_view",
      },
    ],
  },
  {
    key: "assets",
    items: [
      { to: "/assets", label: "Tài sản", icon: <FiBox />, permission: "asset_access" },
      { to: "/transfers", label: "Luân chuyển", icon: <FiRepeat />, permission: "asset_manage" },
      { to: "/maintenance", label: "Bảo trì", icon: <FiTool />, permission: "maintenance_manage" },
    ],
  },
  {
    key: "subscriptions",
    items: [
      {
        to: "/subscriptions",
        label: "Gói đăng ký",
        icon: <FiCreditCard />,
        permission: "subscription_manage",
      },
    ],
  },
  {
    key: "procurement",
    items: [
      {
        to: "/requests",
        label: "Đề nghị mua sắm",
        icon: <FiShoppingCart />,
        permission: "purchase_request_create",
      },
      { to: "/vendors", label: "Nhà cung cấp", icon: <FiBriefcase />, permission: "vendor_manage" },
      { to: "/contracts", label: "Hợp đồng", icon: <FiFileText />, permission: "contract_manage" },
    ],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

function HighlightedLabel({ label, query }: { label: string; query: string }) {
  if (!query) return <>{label}</>;
  const lower = label.toLowerCase();
  const index = lower.indexOf(query);
  if (index < 0) return <>{label}</>;

  return (
    <>
      {label.slice(0, index)}
      <mark>{label.slice(index, index + query.length)}</mark>
      {label.slice(index + query.length)}
    </>
  );
}

export function AppShell() {
  const { user, logout, hasPermission, submitting: authSubmitting } = useAuth();
  const { loading, error, refresh } = useAppData();
  const { submitting: actionSubmitting } = useActions();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");

  const normalizedSidebarSearch = sidebarSearch.trim().toLowerCase();
  const permittedItems = useMemo(
    () => NAV_ITEMS.filter((item) => hasPermission(item.permission)),
    [hasPermission],
  );
  const permittedGroups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => hasPermission(item.permission)),
      })).filter((group) => group.items.length > 0),
    [hasPermission],
  );
  const visibleItems = useMemo(
    () =>
      permittedItems.filter((item) => item.label.toLowerCase().includes(normalizedSidebarSearch)),
    [permittedItems, normalizedSidebarSearch],
  );
  const currentLabel = useMemo(() => {
    const match = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
    return match?.label || "QLVT";
  }, [location.pathname]);
  const currentGroup = useMemo(
    () =>
      permittedGroups.find((group) =>
        group.items.some((item) => location.pathname.startsWith(item.to)),
      ),
    [location.pathname, permittedGroups],
  );
  const subnavItems = currentGroup && currentGroup.items.length > 1 ? currentGroup.items : [];
  const sidebarCompact = collapsed && !mobileOpen;
  const displayName = user?.fullName || user?.username;

  return (
    <main className="app-shell">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? "open" : ""} ${sidebarCompact ? "compact" : ""}`}>
        <div className="brand">
          {sidebarCompact ? (
            <img src="/lgBL.ico" alt="BIMLab" className="brand-icon" />
          ) : (
            <>
              <img src="https://bimlab.com.vn/assets/img/bimlab-logo.png" alt="BIMLab" />
              <p>Quản lý vật tư</p>
            </>
          )}
        </div>

        {!sidebarCompact && (
          <div className="sidebar-search">
            <FiSearch />
            <input
              type="text"
              value={sidebarSearch}
              onChange={(event) => setSidebarSearch(event.target.value)}
              placeholder="Tìm menu..."
              aria-label="Tìm menu chính"
            />
            {sidebarSearch && (
              <button
                type="button"
                onClick={() => setSidebarSearch("")}
                aria-label="Xóa tìm kiếm menu"
              >
                <FiX />
              </button>
            )}
          </div>
        )}

        <nav>
          {visibleItems.length === 0 && !sidebarCompact && (
            <div className="sidebar-empty">Không tìm thấy menu phù hợp.</div>
          )}
          {visibleItems.map((item) => (
            <NavLink
              to={item.to}
              key={item.to}
              title={sidebarCompact ? item.label : undefined}
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={() => setMobileOpen(false)}
            >
              {item.icon}
              {!sidebarCompact && (
                <span>
                  <HighlightedLabel label={item.label} query={normalizedSidebarSearch} />
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="collapse-row">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            title={collapsed ? "Mở rộng" : "Thu nhỏ"}
            aria-label={collapsed ? "Mở rộng menu" : "Thu nhỏ menu"}
          >
            {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>

        <div className="user-card">
          <UserAvatar
            name={displayName}
            seed={user?.id ?? user?.username}
            size={sidebarCompact ? "sm" : "md"}
          />
          {!sidebarCompact && (
            <div>
              <strong>{displayName}</strong>
              <span>{user?.role}</span>
            </div>
          )}
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
        <header className="mobile-topbar">
          <button
            type="button"
            className="menu-button"
            aria-label="Mở menu"
            onClick={() => setMobileOpen(true)}
          >
            <FiMenu />
          </button>
          <div>
            <strong>BIMLab quản lý vật tư</strong>
            <span>{currentLabel}</span>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => void refresh()}
            disabled={loading || actionSubmitting}
            title="Làm mới"
          >
            <FiRefreshCw />
          </button>
        </header>

        {subnavItems.length > 0 && (
          <div className="section-tabs">
            <nav aria-label="Điều hướng nhóm chức năng QLVT">
              {subnavItems.map((item) => (
                <NavLink key={item.to} to={item.to}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <button
              type="button"
              className="secondary"
              onClick={() => void refresh()}
              disabled={loading || actionSubmitting}
            >
              <FiRefreshCw /> Làm mới
            </button>
          </div>
        )}
        {error && <div className="alert">{error}</div>}
        {loading ? <div className="loading">Đang tải dữ liệu...</div> : <Outlet />}
      </section>

      <CrudForm />
    </main>
  );
}
