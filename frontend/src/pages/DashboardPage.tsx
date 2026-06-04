import { useMemo } from "react";
import {
  FiBox,
  FiBriefcase,
  FiCheckCircle,
  FiCreditCard,
  FiShoppingCart,
  FiTool,
  FiTrash2,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { Operation } from "../components/Operation";
import { StatCard } from "../components/StatCard";
import { useAppData } from "../contexts/AppDataContext";
import { money } from "../lib/format";

export function DashboardPage() {
  const { summary, assets, subscriptions, vendors, requests, utilization } = useAppData();
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
  const subscriptionSeats = useMemo(
    () => subscriptions.reduce((sum, item) => sum + Number(item.totalSeats || 0), 0),
    [subscriptions],
  );
  const pendingRequests = requests.filter((request) => request.status === "PENDING").length;
  const activeVendors = vendors.filter((vendor) => vendor.status === "ACTIVE").length;
  const subscriptionCost = useMemo(
    () => subscriptions.reduce((sum, item) => sum + Number(item.cost || 0), 0),
    [subscriptions],
  );

  return (
    <div className="page-grid">
      <section className="hero-panel">
        <div className="hero-pattern" />
        <div className="hero-content">
          <p className="eyebrow">BIMLab Asset Management</p>
          <h1>Dashboard</h1>
          <p>Quản lý vật tư, tài sản và bản quyền phần mềm · {todayLabel}</p>
        </div>
        <div className="hero-summary">
          <span>Tổng giá trị tài sản</span>
          <strong>{money.format(assetValue)}</strong>
        </div>
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
      <section className="panel overview-panel">
        <div className="panel-title">
          <div>
            <h2>Tổng quan vận hành</h2>
            <p>Các chỉ số chính phục vụ quyết định mua sắm và cấp phát.</p>
          </div>
        </div>
        <div className="operations-grid">
          <Operation
            icon={<FiCheckCircle />}
            label="Tài sản trong kho"
            value={assets.filter((item) => item.status === "IN_STOCK").length}
          />
          <Operation
            icon={<FiTrendingUp />}
            label="Gói đăng ký đang hoạt động"
            value={subscriptions.filter((item) => item.status === "ACTIVE").length}
          />
          <Operation
            icon={<FiShoppingCart />}
            label="Tổng đề nghị mua sắm"
            value={summary.purchaseRequests}
          />
          <Operation
            icon={<FiCreditCard />}
            label="Chi phí gói đăng ký"
            value={money.format(subscriptionCost)}
          />
        </div>
      </section>
      {utilization && (
        <section className="panel overview-panel">
          <div className="panel-title">
            <div>
              <h2>Hiệu quả sử dụng tài sản</h2>
              <p>Tỷ lệ tài sản đang được cấp phát so với tổng tài sản đang hoạt động.</p>
            </div>
            <strong style={{ fontSize: "1.8rem" }}>{utilization.utilizationRate}%</strong>
          </div>
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
            <Operation
              icon={<FiCreditCard />}
              label="Tổng giá trị (active)"
              value={money.format(Number(utilization.totalPurchaseValue || 0))}
            />
            <Operation
              icon={<FiBriefcase />}
              label="Giá trị idle"
              value={money.format(Number(utilization.totalIdleValue || 0))}
            />
          </div>
          <div className="operations-grid">
            {Object.entries(utilization.byCategory).map(([category, count]) => (
              <Operation key={category} icon={<FiBox />} label={category} value={count} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
