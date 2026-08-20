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
  FiHelpCircle,
  FiLayers,
  FiLogOut,
  FiMenu,
  FiRefreshCw,
  FiRepeat,
  FiSearch,
  FiShoppingCart,
  FiTool,
  FiX,
} from "react-icons/fi";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { CrudForm } from "../components/forms/CrudForm";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { UserAvatar } from "../components/UserAvatar";
import { useActions } from "../contexts/ActionsContext";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import { useNavigationGuard } from "../contexts/NavigationGuardContext";
import type { Permission } from "../services/types";

interface NavItem {
  to: string;
  label: string;
  icon: ReactElement;
  permission?: Permission | Permission[];
}

interface NavGroup {
  key: string;
  to: string;
  label: string;
  icon: ReactElement;
  permission?: Permission | Permission[];
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
      {
        to: "/asset-categories",
        label: "Phân loại",
        icon: <FiGrid />,
        permission: "asset_manage",
      },
      {
        to: "/asset-catalog-items",
        label: "Danh mục",
        icon: <FiLayers />,
        permission: "asset_manage",
      },
      {
        to: "/transfers",
        label: "Bàn giao",
        icon: <FiRepeat />,
        permission: [
          "asset_transfers_view",
          "asset_transfers_manage",
          "asset_transfers_approve",
          "asset_manage",
        ],
      },
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
  {
    key: "help",
    to: "/help",
    label: "Hướng dẫn sử dụng",
    icon: <FiHelpCircle />,
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
  const navigate = useNavigate();
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

  useEffect(() => {
    let title = "BIMLab QLVT";
    if (location.pathname.startsWith("/dashboard")) title = "Tổng quan | BIMLab QLVT";
    else if (location.pathname.startsWith("/asset-categories"))
      title = "Phân loại tài sản | BIMLab QLVT";
    else if (location.pathname.startsWith("/asset-catalog-items"))
      title = "Danh mục tài sản | BIMLab QLVT";
    else if (location.pathname.startsWith("/assets")) title = "Danh sách tài sản | BIMLab QLVT";
    else if (location.pathname.startsWith("/transfers")) title = "Bàn giao tài sản | BIMLab QLVT";
    else if (location.pathname.startsWith("/maintenance")) title = "Bảo trì tài sản | BIMLab QLVT";
    else if (location.pathname.startsWith("/booking")) title = "Đặt lịch tài sản | BIMLab QLVT";
    else if (location.pathname.startsWith("/requests")) title = "Đề nghị mua sắm | BIMLab QLVT";
    else if (location.pathname.startsWith("/vendors")) title = "Nhà cung cấp | BIMLab QLVT";
    else if (location.pathname.startsWith("/contracts")) title = "Hợp đồng | BIMLab QLVT";
    else if (location.pathname.startsWith("/subscriptions")) title = "Gói đăng ký | BIMLab QLVT";
    else if (location.pathname.startsWith("/help")) title = "Hướng dẫn sử dụng | BIMLab QLVT";
    document.title = title;
  }, [location.pathname]);

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

  const { guard, setGuard } = useNavigationGuard();
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingNavAction, setPendingNavAction] = useState<(() => void) | null>(null);

  const handleGuardedNavigation = (targetUrl: string, event?: React.MouseEvent) => {
    setMobileOpen(false);
    if (guard?.isDirty && location.pathname !== targetUrl) {
      event?.preventDefault();
      setPendingNavAction(() => () => navigate(targetUrl));
      setShowExitModal(true);
      return;
    }
  };

  const handleConfirmExit = () => {
    guard?.onConfirm?.();
    setGuard(null);
    setShowExitModal(false);
    if (pendingNavAction) {
      pendingNavAction();
      setPendingNavAction(null);
    }
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
    setPendingNavAction(null);
  };

  const handleLogout = async () => {
    // Theo HRM: đợi SSO logout xử lý; nếu Keycloak không redirect thì fallback về /login.
    await logout();
    navigate("/login");
  };

  return (
    <main className={`app-shell ${sidebarCompact ? "sidebar-compact" : ""}`}>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? "open" : ""} ${sidebarCompact ? "compact" : ""}`}>
        <button
          type="button"
          className="brand"
          onClick={(e) => {
            if (guard?.isDirty) {
              e.preventDefault();
              setPendingNavAction(() => () => window.location.reload());
              setShowExitModal(true);
              return;
            }
            window.location.reload();
          }}
        >
          {sidebarCompact ? (
            <span className="brand-compact-mark" aria-hidden="true">
              <img src="/simple.png" alt="" />
            </span>
          ) : (
            <>
              <img src="/full_dark.png" alt="BIMLab" />
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
                  onClick={(e) => handleGuardedNavigation(item.to, e)}
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
                        onClick={(e) => handleGuardedNavigation(child.to, e)}
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
            onClick={(e) => {
              if (guard?.isDirty) {
                e.preventDefault();
                setPendingNavAction(() => () => void handleLogout());
                setShowExitModal(true);
                return;
              }
              void handleLogout();
            }}
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
              <span className="section-tabs-parent">{currentGroup?.label}:</span>
              {subnavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={(e) => handleGuardedNavigation(item.to, e)}
                >
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

      {/* Modal xác nhận thoát khi đang thao tác dở dang (Tối giản, không bo góc) */}
      {showExitModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "0px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              maxWidth: "420px",
              width: "100%",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              animation: "fadeIn 0.15s ease",
            }}
          >
            <div style={{ padding: "32px 28px 24px", textAlign: "center" }}>
              {/* Icon Cảnh báo Tối giản */}
              <div
                style={{
                  margin: "0 auto 16px",
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "#fef2f2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ width: "24px", height: "24px" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              {/* Nội dung văn bản */}
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#0f172a",
                  margin: "0 0 8px",
                  letterSpacing: "-0.01em",
                }}
              >
                Rời khỏi trang?
              </h2>
              <p
                style={{
                  fontSize: "13.5px",
                  color: "#475569",
                  lineHeight: "1.6",
                  margin: 0,
                }}
              >
                Bạn đang có{" "}
                <span style={{ fontWeight: 600, color: "#2563eb" }}>
                  {guard?.countLabel || "thông tin"}
                </span>{" "}
                chưa được tạo phiếu. Mọi thay đổi chưa lưu sẽ bị mất.
              </p>
            </div>

            {/* Hành động */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                padding: "0 24px 24px",
              }}
            >
              <button
                type="button"
                onClick={handleCancelExit}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  fontSize: "13.5px",
                  fontWeight: 500,
                  color: "#334155",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "0px",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
              >
                Tiếp tục chỉnh sửa
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  color: "#ffffff",
                  background: "#dc2626",
                  border: "1px solid #dc2626",
                  borderRadius: "0px",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#b91c1c")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#dc2626")}
              >
                Xác nhận thoát
              </button>
            </div>
          </div>
        </div>
      )}

      <CrudForm />
    </main>
  );
}
