import { useEffect, useMemo } from "react";
import {
  FiAlertTriangle,
  FiArchive,
  FiBox,
  FiBriefcase,
  FiCheckCircle,
  FiCreditCard,
  FiShoppingCart,
  FiTool,
  FiTrash2,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import { Operation } from "../components/Operation";
import { StatCard } from "../components/StatCard";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import { money } from "../lib/format";
import type { AssetItem } from "../services/types";

interface ChartDatum {
  label: string;
  value: number;
}

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: "Trong kho",
  ASSIGNED: "Đã cấp phát",
  MAINTENANCE: "Đang bảo trì",
  LOST: "Hỏng / mất",
  DISPOSED: "Thanh lý",
  PENDING: "Chờ xử lý",
};

const STATUS_ORDER = ["IN_STOCK", "ASSIGNED", "MAINTENANCE", "LOST", "DISPOSED"];

function countBy<T>(items: T[], getLabel: (item: T) => string): ChartDatum[] {
  const countMap = new Map<string, number>();
  items.forEach((item) => {
    const label = getLabel(item).trim() || "Chưa phân loại";
    countMap.set(label, (countMap.get(label) || 0) + 1);
  });
  return Array.from(countMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "vi"));
}

function topWithOther(data: ChartDatum[], limit = 6): ChartDatum[] {
  if (data.length <= limit) return data;
  const visible = data.slice(0, limit - 1);
  const other = data.slice(limit - 1).reduce((sum, item) => sum + item.value, 0);
  return [...visible, { label: "Khác", value: other }];
}

function assetCategoryLabel(asset: AssetItem): string {
  return asset.assetCategory?.name || asset.category || asset.fixedAssetType || "Chưa phân loại";
}

function MiniBarChart({
  title,
  caption,
  data,
}: {
  title: string;
  caption: string;
  data: ChartDatum[];
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <article className="dashboard-chart-card">
      <div className="dashboard-chart-heading">
        <div>
          <h3>{title}</h3>
          <p>{caption}</p>
        </div>
        <strong>{total}</strong>
      </div>
      <div className="dashboard-bar-list">
        {data.length === 0 ? (
          <div className="dashboard-empty-chart">Chưa có dữ liệu</div>
        ) : (
          data.map((item) => (
            <div className="dashboard-bar-row" key={item.label}>
              <div className="dashboard-bar-label">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <div className="dashboard-bar-track" aria-hidden="true">
                <span style={{ width: `${Math.max((item.value / maxValue) * 100, 4)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

export function DashboardPage() {
  const {
    summary,
    assets,
    subscriptions,
    vendors,
    requests,
    utilization,
    departments,
    workSites,
    ensureDashboard,
  } = useAppData();
  const { hasPermission } = useAuth();
  // Khớp BE: chỉ nhóm có quyền tài chính mới thấy tổng giá trị (BE null purchaseCost khi thiếu quyền).
  const canViewFinance =
    hasPermission("asset_finance_view") ||
    hasPermission("asset_finance_manage") ||
    hasPermission("asset_manage");

  useEffect(() => {
    void ensureDashboard();
  }, [ensureDashboard]);
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
  const assignedAssets = assets.filter((asset) => asset.status === "ASSIGNED").length;
  const inStockAssets = assets.filter((asset) => asset.status === "IN_STOCK").length;
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

  return (
    <div className="page-grid">
      <section className="hero-panel">
        <div className="hero-pattern" />
        <div className="hero-content">
          <p className="eyebrow">BIMLab Asset Management</p>
          <h1>Dashboard</h1>
          <p>Quản lý tài sản</p>
          <p>{todayLabel}</p>
        </div>
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
          <div>
            <h2>Tình trạng và phân bổ tài sản</h2>
            <p>Thống kê nhanh theo trạng thái, danh mục, chi nhánh và phòng ban.</p>
          </div>
        </div>
        <div className="dashboard-chart-grid">
          <MiniBarChart
            title="Theo trạng thái"
            caption="Tỷ trọng vận hành hiện tại"
            data={statusDistribution}
          />
          <MiniBarChart
            title="Theo danh mục"
            caption="Top nhóm tài sản đang quản lý"
            data={categoryDistribution}
          />
          <MiniBarChart
            title="Theo chi nhánh"
            caption="Phân bổ theo nơi sử dụng"
            data={siteDistribution}
          />
          <MiniBarChart
            title="Theo phòng ban"
            caption="Phân bổ theo đơn vị sử dụng"
            data={departmentDistribution}
          />
        </div>
      </section>
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
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
