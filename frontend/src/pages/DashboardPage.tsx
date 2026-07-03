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

  return (
    <section className="dashboard-page page-grid">
      <div className="panel dashboard-command-center">
        <div className="dashboard-hero-copy">
          <img src="https://bimlab.com.vn/assets/img/bimlab-logo.png" alt="BIMLab" />
          <h1>Hệ thống quản lý tài sản</h1>
          <span>{todayLabel}</span>
        </div>
        <div className="dashboard-system-summary">
          <div>
            <span>Giá trị tài sản</span>
            <strong>{money.format(assetValue)}</strong>
          </div>
        </div>
        <span className="dashboard-hero-pattern pattern-grid-main" aria-hidden="true" />
        <span className="dashboard-hero-pattern pattern-dot-main" aria-hidden="true" />
        <span className="dashboard-hero-pattern pattern-stripe-main" aria-hidden="true" />
        <span className="dashboard-hero-pattern pattern-ring-main" aria-hidden="true" />
      </div>

      <div className="dashboard-main-grid">
        <section className="panel dashboard-shortcuts">
          <div className="panel-title">
            <div>
              <h2>Lối tắt truy cập nhanh</h2>
            </div>
          </div>
          <div className="dashboard-shortcut-grid">
            {QUICK_ACTIONS.map((action) => (
              <NavLink className="dashboard-shortcut" key={action.title} to={action.to}>
                <span>{action.icon}</span>
                <div>
                  <strong>{action.title}</strong>
                  <small>{action.description}</small>
                </div>
              </NavLink>
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
