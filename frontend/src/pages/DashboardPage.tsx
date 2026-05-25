import { useMemo } from 'react'
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
} from 'react-icons/fi'
import { StatCard } from '../components/StatCard'
import { Operation } from '../components/Operation'
import { useAppData } from '../contexts/AppDataContext'
import { money } from '../lib/format'

export function DashboardPage() {
  const { summary, assets, subscriptions, vendors, requests, utilization } = useAppData()

  const assetValue = useMemo(
    () => assets.reduce((sum, item) => sum + Number(item.purchaseCost || 0), 0),
    [assets],
  )
  const subscriptionSeats = useMemo(
    () => subscriptions.reduce((sum, item) => sum + Number(item.totalSeats || 0), 0),
    [subscriptions],
  )
  const pendingRequests = requests.filter((request) => request.status === 'PENDING').length
  const activeVendors = vendors.filter((vendor) => vendor.status === 'ACTIVE').length
  const subscriptionCost = useMemo(
    () => subscriptions.reduce((sum, item) => sum + Number(item.cost || 0), 0),
    [subscriptions],
  )

  return (
    <div className="page-grid">
      <section className="hero-panel">
        <div className="hero-pattern" />
        <div className="hero-content">
          <p className="eyebrow">BIMLab Asset Intelligence</p>
          <h2>Quản lý vật tư, tài sản và license phần mềm</h2>
          <p>
            Theo dõi vòng đời tài sản, nhà cung cấp, subscription và đề nghị mua sắm trong cùng hệ phân quyền HRM.
          </p>
        </div>
        <div className="hero-summary">
          <span>Tổng giá trị tài sản</span>
          <strong>{money.format(assetValue)}</strong>
          <small>Cập nhật theo dữ liệu backend QLVT</small>
        </div>
      </section>
      <div className="stats-grid">
        <StatCard label="Tài sản đang quản lý" value={summary.assets} icon={<FiBox />} tone="blue" />
        <StatCard label="License seat" value={subscriptionSeats} icon={<FiUsers />} tone="violet" />
        <StatCard
          label="Nhà cung cấp hoạt động"
          value={`${activeVendors}/${summary.vendors}`}
          icon={<FiBriefcase />}
          tone="green"
        />
        <StatCard label="Đề nghị chờ xử lý" value={pendingRequests} icon={<FiShoppingCart />} tone="orange" />
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
            value={assets.filter((item) => item.status === 'IN_STOCK').length}
          />
          <Operation
            icon={<FiTrendingUp />}
            label="Subscription đang hoạt động"
            value={subscriptions.filter((item) => item.status === 'ACTIVE').length}
          />
          <Operation icon={<FiShoppingCart />} label="Tổng đề nghị mua sắm" value={summary.purchaseRequests} />
          <Operation icon={<FiCreditCard />} label="Chi phí subscription" value={money.format(subscriptionCost)} />
        </div>
      </section>
      {utilization && (
        <section className="panel overview-panel">
          <div className="panel-title">
            <div>
              <h2>Hiệu quả sử dụng tài sản</h2>
              <p>Tỷ lệ tài sản đang được cấp phát so với tổng tài sản đang hoạt động.</p>
            </div>
            <strong style={{ fontSize: '1.8rem' }}>{utilization.utilizationRate}%</strong>
          </div>
          <div className="operations-grid">
            <Operation icon={<FiCheckCircle />} label="Đang cấp phát" value={utilization.assignedAssets} />
            <Operation icon={<FiBox />} label="Đang trong kho (idle)" value={utilization.idleAssets} />
            <Operation icon={<FiTool />} label="Đang bảo trì" value={utilization.maintenanceAssets} />
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
  )
}
