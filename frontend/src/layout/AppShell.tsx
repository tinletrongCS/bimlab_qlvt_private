import { type ReactElement, useEffect, useMemo, useState } from "react";
import {
  FiBarChart2,
  FiBox,
  FiBriefcase,
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiFileText,
  FiGrid,
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
import { LoadingSkeleton } from "../components/LoadingSkeleton";
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
  to: string;
  label: string;
  icon: ReactElement;
  permission?: Permission;
  children: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: "dashboard",
    to: "/dashboard",
    label: "Tổng quan",
    icon: <FiBarChart2 />,
    permission: "asset_report_view",
    children: [],
  },
  {
    key: "assets",
    to: "/assets",
    label: "Tài sản",
    icon: <FiBox />,
    children: [
      { to: "/assets", label: "Danh sách", icon: <FiBox />, permission: "asset_access" },
      { to: "/asset-categories", label: "Danh mục", icon: <FiGrid />, permission: "asset_manage" },
      { to: "/transfers", label: "Bàn giao", icon: <FiRepeat />, permission: "asset_manage" },
      { to: "/maintenance", label: "Bảo trì", icon: <FiTool />, permission: "maintenance_manage" },
      { to: "/booking", label: "Đặt lịch", icon: <FiCalendar />, permission: "asset_manage" },
    ],
  },
  {
    key: "procurement",
    to: "/requests",
    label: "Mua sắm",
    icon: <FiShoppingCart />,
    children: [
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
  {
    key: "subscriptions",
    to: "/subscriptions",
    label: "Gói đăng ký",
    icon: <FiCreditCard />,
    permission: "subscription_manage",
    children: [],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((group) =>
  group.children.length > 0
    ? group.children
    : [{ to: group.to, label: group.label, icon: group.icon, permission: group.permission }],
);

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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    NAV_GROUPS.reduce<Record<string, boolean>>((acc, group) => {
      acc[group.key] = group.children.some((item) => location.pathname.startsWith(item.to));
      return acc;
    }, {}),
  );

  const normalizedSidebarSearch = sidebarSearch.trim().toLowerCase();
  const searchActive = normalizedSidebarSearch.length > 0;
  const permittedGroups = useMemo(
    () =>
      NAV_GROUPS.map((group) => {
        const permittedChildren = group.children.filter((item) => hasPermission(item.permission));
        if (group.children.length > 0) {
          return permittedChildren.length > 0
            ? {
                ...group,
                to: permittedChildren[0].to,
                children: permittedChildren,
              }
            : null;
        }
        return hasPermission(group.permission) ? group : null;
      }).filter((group): group is NavGroup => group !== null),
    [hasPermission],
  );
  const visibleGroups = useMemo(
    () =>
      permittedGroups
        .map((group) => {
          const parentMatches = group.label.toLowerCase().includes(normalizedSidebarSearch);
          const matchingChildren = group.children.filter((item) =>
            item.label.toLowerCase().includes(normalizedSidebarSearch),
          );
          return {
            ...group,
            parentMatches,
            childMatches: matchingChildren.length > 0,
            visibleChildren:
              searchActive && !parentMatches && matchingChildren.length > 0
                ? matchingChildren
                : group.children,
          };
        })
        .filter((group) => !searchActive || group.parentMatches || group.childMatches),
    [permittedGroups, normalizedSidebarSearch, searchActive],
  );
  const currentLabel = useMemo(() => {
    const match = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
    return match?.label || "QLVT";
  }, [location.pathname]);
  const currentGroup = useMemo(
    () =>
      permittedGroups.find((group) =>
        [group.to, ...group.children.map((item) => item.to)].some((to) =>
          location.pathname.startsWith(to),
        ),
      ),
    [location.pathname, permittedGroups],
  );
  const subnavItems = currentGroup && currentGroup.children.length > 0 ? currentGroup.children : [];
  const sidebarCompact = collapsed && !mobileOpen;
  const displayName = user?.fullName || user?.username;

  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((group) =>
      group.children.some((item) => location.pathname.startsWith(item.to)),
    );
    if (!activeGroup) return;
    setOpenGroups((prev) => ({ ...prev, [activeGroup.key]: true }));
  }, [location.pathname]);

  const toggleGroup = (key: string) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

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
        <button type="button" className="brand" onClick={() => window.location.reload()}>
          {sidebarCompact ? (
            <span className="brand-compact-mark" aria-hidden="true">
              <img src="/lgBL.ico" alt="" />
            </span>
          ) : (
            <>
              <img src="https://bimlab.com.vn/assets/img/bimlab-logo.png" alt="BIMLab" />
              <p>Quản lý tài sản</p>
            </>
          )}
        </button>

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
          {visibleGroups.length === 0 && !sidebarCompact && (
            <div className="sidebar-empty">Không tìm thấy menu phù hợp.</div>
          )}
          {visibleGroups.map((item) => {
            const isGroupActive =
              currentGroup?.key === item.key || location.pathname.startsWith(item.to);

            if (item.children.length === 0 || sidebarCompact) {
              return (
                <NavLink
                  to={item.to}
                  key={item.key}
                  title={sidebarCompact ? item.label : undefined}
                  className={() => (isGroupActive ? "active" : "")}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon}
                  {!sidebarCompact && (
                    <span>
                      <HighlightedLabel label={item.label} query={normalizedSidebarSearch} />
                    </span>
                  )}
                </NavLink>
              );
            }

            const isOpen = searchActive ? true : openGroups[item.key];

            return (
              <div className="sidebar-group" key={item.key}>
                <button
                  type="button"
                  className={`sidebar-group-button ${isGroupActive ? "active" : ""}`}
                  onClick={() => toggleGroup(item.key)}
                >
                  {item.icon}
                  <span>
                    <HighlightedLabel label={item.label} query={normalizedSidebarSearch} />
                  </span>
                  {isOpen ? <FiChevronDown /> : <FiChevronRight />}
                </button>

                {isOpen && (
                  <div className="sidebar-submenu">
                    {item.visibleChildren.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end
                        className={({ isActive }) => (isActive ? "active" : "")}
                        onClick={() => setMobileOpen(false)}
                      >
                        <span>
                          <HighlightedLabel label={child.label} query={normalizedSidebarSearch} />
                        </span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
        {loading ? <LoadingSkeleton variant="content" /> : <Outlet />}
      </section>

      <CrudForm />
    </main>
  );
}
