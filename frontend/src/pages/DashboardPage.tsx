import { useEffect, useMemo, useState } from "react";
import {
  FiArchive,
  FiBox,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiGrid,
  FiRepeat,
  FiShoppingCart,
  FiTool,
} from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import { money } from "../lib/format";
import { loadAssetBookings } from "../services/api";
import type { AssetBooking } from "../services/types";

const QUICK_ACTIONS = [
  {
    to: "/assets",
    title: "Danh sách tài sản",
    description: "Tra cứu, lọc theo danh mục và xem chi tiết tài sản.",
    icon: <FiBox />,
  },
  {
    to: "/asset-categories",
    title: "Danh mục tài sản",
    description: "Quản lý cây danh mục và nhóm phân loại tài sản.",
    icon: <FiGrid />,
  },
  {
    to: "/booking",
    title: "Đặt lịch phòng họp",
    description: "Kiểm tra khả dụng và tạo phiên booking phòng họp.",
    icon: <FiCalendar />,
  },
  {
    to: "/transfers",
    title: "Bàn giao tài sản",
    description: "Theo dõi luồng bàn giao và điều chuyển tài sản.",
    icon: <FiRepeat />,
  },
  {
    to: "/maintenance",
    title: "Bảo trì",
    description: "Quản lý lịch sử và trạng thái bảo trì tài sản.",
    icon: <FiTool />,
  },
  {
    to: "/vendors",
    title: "Nhà cung cấp",
    description: "Quản lý đối tác mua sắm và thông tin tham chiếu.",
    icon: <FiBriefcase />,
  },
];

function formatTimeRange(item: AssetBooking) {
  const start = new Date(item.startTime);
  const end = new Date(item.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Chưa có thời gian";
  const date = start.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  const startTime = start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const endTime = end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${startTime} - ${endTime}`;
}

export function DashboardPage() {
  const { summary, assets, vendors, requests, ensureDashboard } = useAppData();
  const [bookings, setBookings] = useState<AssetBooking[]>([]);

  useEffect(() => {
    void ensureDashboard();
  }, [ensureDashboard]);

  useEffect(() => {
    const now = new Date();
    const to = new Date(now);
    to.setDate(to.getDate() + 7);
    loadAssetBookings({
      fromTime: now.toISOString(),
      toTime: to.toISOString(),
    })
      .then((data) => {
        setBookings(
          data
            .filter((item) => !["CANCELLED", "REJECTED"].includes(item.status))
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .slice(0, 5),
        );
      })
      .catch(() => setBookings([]));
  }, []);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [],
  );

  const assetValue = useMemo(
    () => assets.reduce((sum, item) => sum + Number(item.purchaseCost || 0), 0),
    [assets],
  );
  const activeVendors = vendors.filter((vendor) => vendor.status === "ACTIVE").length;
  const pendingRequests = requests.filter((request) => request.status === "PENDING").length;
  const inStockAssets = assets.filter((asset) => asset.status === "IN_STOCK").length;
<<<<<<< HEAD
=======
  const maintenanceAssets = assets.filter((asset) => asset.status === "MAINTENANCE").length;
  const lostAssets = assets.filter((asset) => asset.status === "LOST").length;
  const disposedAssets = assets.filter((asset) => asset.status === "DISPOSED").length;
  const subscriptionCost = useMemo(
    () => subscriptions.reduce((sum, item) => sum + Number(item.cost || 0), 0),
    [subscriptions],
  );
  const statusDistribution = useMemo(() => {
    const countMap = new Map<string, number>();
    assets.forEach((asset) => {
      countMap.set(asset.status, (countMap.get(asset.status) || 0) + 1);
    });

    const ordered = STATUS_ORDER.map((status) => ({
      label: STATUS_LABELS[status] || status,
      value: countMap.get(status) || 0,
    }));
    const other = Array.from(countMap.entries())
      .filter(([status]) => !STATUS_ORDER.includes(status))
      .map(([status, value]) => ({ label: STATUS_LABELS[status] || status, value }));

    return [...ordered, ...other].filter((item) => item.value > 0);
  }, [assets]);
  const departmentNameById = useMemo(
    () => new Map(departments.map((department) => [department.id, department.name])),
    [departments],
  );
  const workSiteNameById = useMemo(
    () => new Map(workSites.map((site) => [site.id, site.name])),
    [workSites],
  );
  const categoryDistribution = useMemo(
    () => topWithOther(countBy(assets, assetCategoryLabel)),
    [assets],
  );
  const siteDistribution = useMemo(
    () =>
      topWithOther(
        countBy(assets, (asset) =>
          asset.siteId
            ? workSiteNameById.get(asset.siteId) || `Chi nhánh #${asset.siteId}`
            : "Chưa gán chi nhánh",
        ),
      ),
    [assets, workSiteNameById],
  );
  const departmentDistribution = useMemo(
    () =>
      topWithOther(
        countBy(assets, (asset) =>
          asset.departmentId
            ? departmentNameById.get(asset.departmentId) || `Phòng ban #${asset.departmentId}`
            : "Chưa gán phòng ban",
        ),
      ),
    [assets, departmentNameById],
  );
>>>>>>> 6b3e4c6aa0e876a1f002345ce483febec7efd777

  return (
    <section className="dashboard-page page-grid">
      <div className="panel dashboard-command-center">
        <div className="dashboard-hero-copy">
          <img src="https://bimlab.com.vn/assets/img/bimlab-logo.png" alt="BIMLab" />
          <h1>Hệ thống quản lý tài sản</h1> 
          <span>{todayLabel}</span>
        </div>
<<<<<<< HEAD
        <div className="dashboard-system-summary">
=======
        {canViewFinance && (
          <div className="hero-summary">
            <span>Tổng giá trị tài sản</span>
            <strong>{money.format(assetValue)}</strong>
          </div>
        )}
        <svg className="hero-equipment-art" aria-hidden="true" viewBox="0 0 360 190">
          <g className="hero-art-line">
            <rect x="24" y="76" width="118" height="72" rx="6" />
            <path d="M42 148h180l18 26H28l14-26Z" />
            <path d="M55 91h86M55 107h62M55 123h75" />
            <path d="M176 62h82a12 12 0 0 1 12 12v94H164V74a12 12 0 0 1 12-12Z" />
            <path d="M184 83h48M184 101h34M184 119h52M184 137h42" />
            <path d="M292 44h46v132h-46z" />
            <path d="M304 60h26M304 78h26M304 96h26M304 114h26M304 132h26" />
            <path d="M252 44v-20h80v20" />
            <path d="M260 24l-10 12M332 24l10 12" />
          </g>
          <g className="hero-art-detail">
            <circle cx="258" cy="154" r="4" />
            <circle cx="315" cy="158" r="4" />
            <path d="M16 56h80M34 42h42M118 44h52" />
          </g>
        </svg>
      </section>
      <div className="stats-grid">
        <StatCard
          label="Tài sản đang quản lý"
          value={summary.assets}
          icon={<FiBox />}
          tone="blue"
        />
        <StatCard label="License seat" value={subscriptionSeats} icon={<FiUsers />} tone="violet" />
        <StatCard
          label="Nhà cung cấp hoạt động"
          value={`${activeVendors}/${summary.vendors}`}
          icon={<FiBriefcase />}
          tone="green"
        />
        <StatCard
          label="Đề nghị chờ xử lý"
          value={pendingRequests}
          icon={<FiShoppingCart />}
          tone="orange"
        />
      </div>
      <div className="stats-grid asset-status-grid">
        <StatCard label="Tổng tài sản" value={assets.length} icon={<FiBox />} tone="blue" />
        <StatCard label="Đã cấp phát" value={assignedAssets} icon={<FiUserCheck />} tone="green" />
        <StatCard label="Trong kho" value={inStockAssets} icon={<FiArchive />} tone="orange" />
        <StatCard label="Bảo trì" value={maintenanceAssets} icon={<FiTool />} tone="violet" />
        <StatCard label="Hỏng / mất" value={lostAssets} icon={<FiAlertTriangle />} tone="red" />
        <StatCard label="Thanh lý" value={disposedAssets} icon={<FiTrash2 />} tone="slate" />
      </div>
      <section className="panel dashboard-analytics-panel">
        <div className="panel-title">
>>>>>>> 6b3e4c6aa0e876a1f002345ce483febec7efd777
          <div>
            <span>Tài sản</span>
            <strong>{summary.assets}</strong>
          </div>
          <div>
            <span>Trong kho</span>
            <strong>{inStockAssets}</strong>
          </div>
          <div>
            <span>Giá trị đang hiển thị</span>
            <strong>{money.format(assetValue)}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-main-grid">
        <section className="panel dashboard-shortcuts">
          <div className="panel-title">
            <div>
              <h2>Truy cập nhanh</h2>
              <p>Các nghiệp vụ thường dùng trong quản lý tài sản.</p>
            </div>
          </div>
<<<<<<< HEAD
          <div className="dashboard-shortcut-grid">
            {QUICK_ACTIONS.map((action) => (
              <NavLink className="dashboard-shortcut" key={action.title} to={action.to}>
                <span>{action.icon}</span>
                <div>
                  <strong>{action.title}</strong>
                  <small>{action.description}</small>
                </div>
              </NavLink>
=======
          <div className="operations-grid">
            <Operation
              icon={<FiCheckCircle />}
              label="Đang cấp phát"
              value={utilization.assignedAssets}
            />
            <Operation
              icon={<FiBox />}
              label="Đang trong kho (idle)"
              value={utilization.idleAssets}
            />
            <Operation
              icon={<FiTool />}
              label="Đang bảo trì"
              value={utilization.maintenanceAssets}
            />
            <Operation icon={<FiTrash2 />} label="Đã thanh lý" value={utilization.disposedAssets} />
            {canViewFinance && (
              <Operation
                icon={<FiCreditCard />}
                label="Tổng giá trị (active)"
                value={money.format(Number(utilization.totalPurchaseValue || 0))}
              />
            )}
            {canViewFinance && (
              <Operation
                icon={<FiBriefcase />}
                label="Giá trị idle"
                value={money.format(Number(utilization.totalIdleValue || 0))}
              />
            )}
          </div>
          <div className="operations-grid">
            {Object.entries(utilization.byCategory).map(([category, count]) => (
              <Operation key={category} icon={<FiBox />} label={category} value={count} />
>>>>>>> 6b3e4c6aa0e876a1f002345ce483febec7efd777
            ))}
          </div>
        </section>

        <aside className="panel dashboard-side-panel">
          <div className="panel-title">
            <div>
              <h2>Lịch phòng họp gần nhất</h2>
              <p>Các phiên booking sắp diễn ra hoặc đang sử dụng.</p>
            </div>
          </div>
          <div className="dashboard-booking-list">
            {bookings.length === 0 ? (
              <div className="empty-state">Chưa có lịch phòng họp trong 7 ngày tới.</div>
            ) : (
              bookings.map((booking) => (
                <NavLink className="dashboard-booking-item" key={booking.id} to="/booking">
                  <FiClock />
                  <div>
                    <strong>{booking.title}</strong>
                    <span>{booking.assetName || booking.assetCode || "Phòng họp"}</span>
                    <small>{formatTimeRange(booking)}</small>
                  </div>
                  <StatusBadge value={booking.status} />
                </NavLink>
              ))
            )}
          </div>
        </aside>
      </div>

      <section className="panel dashboard-health-panel">
        <div className="panel-title">
          <div>
            <h2>Tình trạng hệ thống</h2>
            <p>Thông tin tổng quát, không thay thế các báo cáo chi tiết ở từng phân hệ.</p>
          </div>
        </div>
        <div className="dashboard-health-grid">
          <div>
            <FiCheckCircle />
            <span>Tài sản đang quản lý</span>
            <strong>{summary.assets}</strong>
          </div>
          <div>
            <FiBriefcase />
            <span>Nhà cung cấp hoạt động</span>
            <strong>
              {activeVendors}/{summary.vendors}
            </strong>
          </div>
          <div>
            <FiShoppingCart />
            <span>Đề nghị mua sắm chờ xử lý</span>
            <strong>{pendingRequests}</strong>
          </div>
          <div>
            <FiArchive />
            <span>Tài liệu nghiệp vụ</span>
            <strong>
              <NavLink to="/help">Mở hướng dẫn</NavLink>
            </strong>
          </div>
          <div>
            <FiFileText />
            <span>Hồ sơ tham chiếu</span>
            <strong>{summary.contracts + summary.subscriptions}</strong>
          </div>
        </div>
      </section>
    </section>
  );
}
