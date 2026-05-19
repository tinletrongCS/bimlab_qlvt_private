import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactElement } from 'react'
import { animate, createTimeline, stagger } from 'animejs'
import {
  FiBarChart2,
  FiBox,
  FiBriefcase,
  FiCheckCircle,
  FiCreditCard,
  FiEdit2,
  FiFileText,
  FiLogIn,
  FiLogOut,
  FiPlus,
  FiRefreshCw,
  FiShield,
  FiShoppingCart,
  FiTrash2,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi'
import { CrudModal } from './components/CrudModal'
import { DataTable } from './components/DataTable'
import { StatCard } from './components/StatCard'
import { StatusBadge } from './components/StatusBadge'
import {
  createAsset,
  createContract,
  createPurchaseRequest,
  createSubscription,
  createVendor,
  deleteAsset,
  deleteContract,
  deletePurchaseRequest,
  deleteSubscription,
  deleteVendor,
  loadAssets,
  loadContracts,
  loadCurrentUser,
  loadDashboard,
  loadDepartments,
  loadEmployees,
  loadPurchaseRequests,
  loadProjects,
  loadSubscriptions,
  loadVendors,
  loadWorkSites,
  login,
  logout,
  updateAsset,
  updateContract,
  updatePurchaseRequest,
  updatePurchaseRequestStatus,
  updateSubscription,
  updateVendor,
} from './services/api'
import type {
  AssetItem,
  AssetPayload,
  AuthUser,
  Contract,
  ContractPayload,
  DashboardSummary,
  DepartmentLite,
  EmployeeLite,
  Permission,
  ProjectLite,
  PurchaseRequest,
  PurchaseRequestPayload,
  Subscription,
  SubscriptionPayload,
  Vendor,
  VendorPayload,
  WorkSiteLite,
} from './services/types'

type TabKey = 'dashboard' | 'assets' | 'subscriptions' | 'vendors' | 'requests' | 'contracts'
type ModalState =
  | { type: 'vendor'; mode: 'create'; item?: undefined }
  | { type: 'vendor'; mode: 'edit'; item: Vendor }
  | { type: 'asset'; mode: 'create'; item?: undefined }
  | { type: 'asset'; mode: 'edit'; item: AssetItem }
  | { type: 'subscription'; mode: 'create'; item?: undefined }
  | { type: 'subscription'; mode: 'edit'; item: Subscription }
  | { type: 'request'; mode: 'create'; item?: undefined }
  | { type: 'request'; mode: 'edit'; item: PurchaseRequest }
  | { type: 'contract'; mode: 'create'; item?: undefined }
  | { type: 'contract'; mode: 'edit'; item: Contract }
  | null

const tabs: Array<{ key: TabKey; label: string; icon: ReactElement; permission?: Permission }> = [
  { key: 'dashboard', label: 'Tổng quan', icon: <FiBarChart2 />, permission: 'asset_report_view' },
  { key: 'assets', label: 'Tài sản', icon: <FiBox />, permission: 'asset_access' },
  { key: 'subscriptions', label: 'Subscription', icon: <FiCreditCard />, permission: 'subscription_manage' },
  { key: 'vendors', label: 'Nhà cung cấp', icon: <FiBriefcase />, permission: 'vendor_manage' },
  { key: 'requests', label: 'Đề nghị mua sắm', icon: <FiShoppingCart />, permission: 'purchase_request_create' },
  { key: 'contracts', label: 'Hợp đồng', icon: <FiFileText />, permission: 'contract_manage' },
]

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })

function hasPermission(user: AuthUser | null, permission?: Permission) {
  if (!permission) return true
  if (user?.role === 'ADMIN') return true
  return Boolean(user?.permissions?.includes(permission))
}

function App() {
  const loginSceneRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [summary, setSummary] = useState<DashboardSummary>({ assets: 0, subscriptions: 0, vendors: 0, purchaseRequests: 0, contracts: 0 })
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [employees, setEmployees] = useState<EmployeeLite[]>([])
  const [departments, setDepartments] = useState<DepartmentLite[]>([])
  const [workSites, setWorkSites] = useState<WorkSiteLite[]>([])
  const [projects, setProjects] = useState<ProjectLite[]>([])

  const visibleTabs = useMemo(() => tabs.filter((tab) => hasPermission(user, tab.permission)), [user])
  const assetValue = useMemo(() => assets.reduce((sum, item) => sum + Number(item.purchaseCost || 0), 0), [assets])
  const subscriptionSeats = useMemo(() => subscriptions.reduce((sum, item) => sum + Number(item.totalSeats || 0), 0), [subscriptions])

  async function bootstrap() {
    setLoading(true)
    setError('')
    try {
      const currentUser = await loadCurrentUser()
      setUser(currentUser)
      if (currentUser) await refreshData()
    } catch (err) {
      setError(readError(err))
    } finally {
      setLoading(false)
    }
  }

  async function refreshData() {
    const [dashboardData, vendorData, assetData, subscriptionData, requestData, contractData, employeeData, departmentData, siteData, projectData] = await Promise.all([
      loadDashboard().catch(() => ({ assets: 0, subscriptions: 0, vendors: 0, purchaseRequests: 0, contracts: 0 })),
      loadVendors().catch(() => []),
      loadAssets().catch(() => []),
      loadSubscriptions().catch(() => []),
      loadPurchaseRequests().catch(() => []),
      loadContracts().catch(() => []),
      loadEmployees().catch(() => []),
      loadDepartments().catch(() => []),
      loadWorkSites().catch(() => []),
      loadProjects().catch(() => []),
    ])
    setSummary(dashboardData)
    setVendors(vendorData)
    setAssets(assetData)
    setSubscriptions(subscriptionData)
    setRequests(requestData)
    setContracts(contractData)
    setEmployees(employeeData)
    setDepartments(departmentData)
    setWorkSites(siteData)
    setProjects(projectData)
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const loginUser = await login(username, password)
      setUser(loginUser)
      await refreshData()
    } catch (err) {
      setError(readError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    setSubmitting(true)
    setError('')
    try {
      await logout()
    } catch {
      // Token may already be expired; local logout still valid.
    } finally {
      setUser(null)
      setPassword('')
      setAssets([])
      setSubscriptions([])
      setVendors([])
      setRequests([])
      setContracts([])
      setSubmitting(false)
    }
  }

  async function handleDelete(type: Exclude<TabKey, 'dashboard'>, id: number) {
    if (!window.confirm('Xóa dữ liệu này?')) return
    setSubmitting(true)
    setError('')
    try {
      if (type === 'vendors') await deleteVendor(id)
      if (type === 'assets') await deleteAsset(id)
      if (type === 'subscriptions') await deleteSubscription(id)
      if (type === 'requests') await deletePurchaseRequest(id)
      if (type === 'contracts') await deleteContract(id)
      await refreshData()
    } catch (err) {
      setError(readError(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApproveRequest(id: number, status: string) {
    setSubmitting(true)
    setError('')
    try {
      await updatePurchaseRequestStatus(id, status)
      await refreshData()
    } catch (err) {
      setError(readError(err))
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    bootstrap()
  }, [])

  useEffect(() => {
    if (user || loading || !loginSceneRef.current) return
    const root = loginSceneRef.current
    const timeline = createTimeline({ defaults: { ease: 'outExpo' } })
    timeline.add(root.querySelectorAll('.bim-shape'), {
      opacity: [0, 1],
      scale: [0.55, 1],
      duration: 700,
      delay: stagger(80, { from: 'center' }),
    }, 0)
    const loginCard = root.querySelector('.login-card')
    if (loginCard) {
      timeline.add(loginCard, {
        opacity: [0, 1],
        translateY: [28, 0],
        scale: [0.96, 1],
        duration: 560,
      }, 100)
    }
    timeline.add(root.querySelectorAll('.login-field'), {
      opacity: [0, 1],
      translateX: [-14, 0],
      duration: 320,
      delay: stagger(70),
    }, 420)
    animate(root.querySelectorAll('.bim-shape'), {
      translateY: [0, -8, 0],
      duration: 4200,
      loop: true,
      ease: 'inOutSine',
      delay: stagger(520),
    })
  }, [user, loading])

  if (!user && !loading) {
    return (
      <main className="login-shell">
        <section className="login-blueprint" ref={loginSceneRef}>
          <div className="blueprint-grid" />
          <div className="login-radial" />
          <svg className="bim-shape shape-cube" viewBox="0 0 80 80">
            <polygon points="40,5 75,22 75,58 40,75 5,58 5,22" fill="none" stroke="rgba(21,77,124,0.30)" strokeWidth="1.5" />
            <line x1="40" y1="5" x2="40" y2="75" stroke="rgba(21,77,124,0.18)" />
            <line x1="5" y1="22" x2="75" y2="58" stroke="rgba(21,77,124,0.18)" />
          </svg>
          <svg className="bim-shape shape-building" viewBox="0 0 100 120">
            <rect x="10" y="30" width="30" height="90" fill="none" stroke="rgba(21,77,124,0.24)" strokeWidth="1.5" />
            <rect x="50" y="10" width="40" height="110" fill="none" stroke="rgba(21,77,124,0.24)" strokeWidth="1.5" />
            {[40, 56, 72].map((y) => <rect key={y} x="17" y={y} width="8" height="8" fill="rgba(21,77,124,0.13)" />)}
            {[22, 38, 54].map((y) => <rect key={y} x="62" y={y} width="8" height="8" fill="rgba(21,77,124,0.13)" />)}
          </svg>
          <svg className="bim-shape shape-dimension" viewBox="0 0 120 40">
            <line x1="5" y1="20" x2="115" y2="20" stroke="rgba(42,123,196,0.35)" strokeDasharray="4 3" />
            <line x1="5" y1="10" x2="5" y2="30" stroke="rgba(42,123,196,0.35)" />
            <line x1="115" y1="10" x2="115" y2="30" stroke="rgba(42,123,196,0.35)" />
            <text x="60" y="14" textAnchor="middle" fill="rgba(42,123,196,0.55)" fontSize="8">QLVT</text>
          </svg>
          <div className="login-card">
            <div className="login-logo">
              <img src="https://bimlab.com.vn/assets/img/bimlab-logo.png" alt="BIMLab" />
            </div>
            <p className="login-subtitle">Quản lý vật tư · tài sản · subscription</p>
            <h1>Đăng nhập QLVT</h1>
            <form onSubmit={handleLogin}>
              <label className="login-field">Tên đăng nhập<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="Nhập username HRM" /></label>
              <label className="login-field">Mật khẩu<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Nhập mật khẩu" /></label>
              {error && <div className="alert login-field">{error}</div>}
              <button className="login-btn" disabled={loading} type="submit"><FiLogIn /> Đăng nhập</button>
            </form>
            <div className="login-note">
              <FiShield />
              <span>Dùng chung tài khoản HRM, phân quyền theo role hiện tại.</span>
            </div>
          </div>
       </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="https://bimlab.com.vn/assets/img/bimlab-logo.png" alt="BIMLab" />
          <p>Quản lý vật tư</p>
        </div>
        <nav>
          {visibleTabs.map((tab) => (
            <button className={activeTab === tab.key ? 'active' : ''} key={tab.key} onClick={() => setActiveTab(tab.key)}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="user-card">
          <FiShield />
          <div>
            <strong>{user?.fullName || user?.username}</strong>
            <span>{user?.role}</span>
          </div>
          <button className="logout-button" onClick={handleLogout} disabled={submitting} title="Đăng xuất">
            <FiLogOut />
          </button>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Giai đoạn 4</p>
            <h1>{tabs.find((tab) => tab.key === activeTab)?.label}</h1>
          </div>
          <button className="secondary" onClick={refreshData} disabled={loading || submitting}><FiRefreshCw /> Làm mới</button>
        </header>
        {error && <div className="alert">{error}</div>}
        {loading ? <div className="loading">Đang tải dữ liệu...</div> : renderTab(activeTab)}
      </section>
      {modal && (
        <CrudForm
          modal={modal}
          vendors={vendors}
          employees={employees}
          departments={departments}
          workSites={workSites}
          projects={projects}
          submitting={submitting}
          onClose={() => setModal(null)}
          onSubmit={submitModal}
        />
      )}
    </main>
  )

  async function submitModal(payload: VendorPayload | AssetPayload | SubscriptionPayload | PurchaseRequestPayload | ContractPayload) {
    if (!modal) return
    setSubmitting(true)
    setError('')
    try {
      if (modal.type === 'vendor') {
        modal.mode === 'create'
          ? await createVendor(payload as VendorPayload)
          : await updateVendor(modal.item.id, payload as VendorPayload)
      }
      if (modal.type === 'asset') {
        modal.mode === 'create'
          ? await createAsset(payload as AssetPayload)
          : await updateAsset(modal.item.id, payload as AssetPayload)
      }
      if (modal.type === 'subscription') {
        modal.mode === 'create'
          ? await createSubscription(payload as SubscriptionPayload)
          : await updateSubscription(modal.item.id, payload as SubscriptionPayload)
      }
      if (modal.type === 'request') {
        modal.mode === 'create'
          ? await createPurchaseRequest(payload as PurchaseRequestPayload)
          : await updatePurchaseRequest(modal.item.id, payload as PurchaseRequestPayload)
      }
      if (modal.type === 'contract') {
        modal.mode === 'create'
          ? await createContract(payload as ContractPayload)
          : await updateContract(modal.item.id, payload as ContractPayload)
      }
      setModal(null)
      await refreshData()
    } catch (err) {
      setError(readError(err))
    } finally {
      setSubmitting(false)
    }
  }

  function renderTab(tab: TabKey) {
    if (tab === 'dashboard') return renderDashboard()
    if (tab === 'assets') return renderAssets()
    if (tab === 'subscriptions') return renderSubscriptions()
    if (tab === 'vendors') return renderVendors()
    if (tab === 'contracts') return renderContracts()
    return renderRequests()
  }

  function renderDashboard() {
    const pendingRequests = requests.filter((request) => request.status === 'PENDING').length
    const activeVendors = vendors.filter((vendor) => vendor.status === 'ACTIVE').length
    return (
      <div className="page-grid">
        <section className="hero-panel">
          <div className="hero-pattern" />
          <div className="hero-content">
            <p className="eyebrow">BIMLab Asset Intelligence</p>
            <h2>Quản lý vật tư, tài sản và license phần mềm</h2>
            <p>Theo dõi vòng đời tài sản, nhà cung cấp, subscription và đề nghị mua sắm trong cùng hệ phân quyền HRM.</p>
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
          <StatCard label="Nhà cung cấp hoạt động" value={`${activeVendors}/${summary.vendors}`} icon={<FiBriefcase />} tone="green" />
          <StatCard label="Đề nghị chờ xử lý" value={pendingRequests} icon={<FiShoppingCart />} tone="orange" />
        </div>
        <section className="panel overview-panel">
          <div className="panel-title"><div><h2>Tổng quan vận hành</h2><p>Các chỉ số chính phục vụ quyết định mua sắm và cấp phát.</p></div></div>
          <div className="operations-grid">
            <Operation icon={<FiCheckCircle />} label="Tài sản trong kho" value={assets.filter((item) => item.status === 'IN_STOCK').length} />
            <Operation icon={<FiTrendingUp />} label="Subscription đang hoạt động" value={subscriptions.filter((item) => item.status === 'ACTIVE').length} />
            <Operation icon={<FiShoppingCart />} label="Tổng đề nghị mua sắm" value={summary.purchaseRequests} />
            <Operation icon={<FiCreditCard />} label="Chi phí subscription" value={money.format(subscriptions.reduce((sum, item) => sum + Number(item.cost || 0), 0))} />
          </div>
        </section>
      </div>
    )
  }

  function renderAssets() {
    const canManage = hasPermission(user, 'asset_manage')
    const employeeName = (id?: number) => id ? employeeLabel(employees.find((employee) => employee.id === id)) : 'Trong kho'
    const departmentName = (id?: number) => id ? departments.find((department) => department.id === id)?.name || `Phòng ban #${id}` : '—'
    const siteName = (id?: number) => id ? workSites.find((site) => site.id === id)?.name || `Site #${id}` : '—'
    const projectName = (id?: number) => id ? projectLabel(projects.find((project) => project.id === id)) : '—'
    return (
      <section className="panel">
        <PanelHeader title="Danh sách tài sản" action={canManage} onAdd={() => setModal({ type: 'asset', mode: 'create' })} />
        <DataTable
          data={assets}
          getRowKey={(item) => item.id}
          emptyText="Chưa có tài sản"
          columns={[
            { key: 'code', title: 'Mã', render: (item) => item.assetCode },
            { key: 'name', title: 'Tên tài sản', render: (item) => <strong>{item.name}</strong> },
            { key: 'category', title: 'Nhóm', render: (item) => item.category },
            { key: 'vendor', title: 'Nhà cung cấp', render: (item) => item.vendor?.name || '—' },
            { key: 'owner', title: 'Người dùng', render: (item) => <span className="muted-cell">{employeeName(item.assignedEmployeeId)}</span> },
            { key: 'scope', title: 'Liên kết', render: (item) => <span className="muted-cell">{departmentName(item.departmentId)} · {siteName(item.siteId)} · {projectName(item.projectId)}</span> },
            { key: 'value', title: 'Giá trị', render: (item) => money.format(Number(item.purchaseCost || 0)) },
            { key: 'status', title: 'Trạng thái', render: (item) => <StatusBadge value={item.status} /> },
            { key: 'actions', title: '', render: (item) => canManage && <AssetActions item={item} onEdit={() => setModal({ type: 'asset', mode: 'edit', item })} onDelete={() => handleDelete('assets', item.id)} onRevoke={() => revokeAsset(item)} /> },
          ]}
        />
      </section>
    )
  }

  function renderSubscriptions() {
    const canManage = hasPermission(user, 'subscription_manage')
    return (
      <section className="panel">
        <PanelHeader title="Subscription phần mềm" action={canManage} onAdd={() => setModal({ type: 'subscription', mode: 'create' })} />
        <DataTable
          data={subscriptions}
          getRowKey={(item) => item.id}
          emptyText="Chưa có subscription"
          columns={[
            { key: 'name', title: 'Phần mềm', render: (item) => <strong>{item.softwareName}</strong> },
            { key: 'plan', title: 'Gói', render: (item) => item.planName || '—' },
            { key: 'vendor', title: 'Nhà cung cấp', render: (item) => item.vendor?.name || '—' },
            { key: 'seat', title: 'Seat', render: (item) => <SeatUsage subscription={item} /> },
            { key: 'renewal', title: 'Gia hạn', render: (item) => item.renewalDate || '—' },
            { key: 'status', title: 'Trạng thái', render: (item) => <StatusBadge value={item.status} /> },
            { key: 'actions', title: '', render: (item) => canManage && <RowActions onEdit={() => setModal({ type: 'subscription', mode: 'edit', item })} onDelete={() => handleDelete('subscriptions', item.id)} /> },
          ]}
        />
      </section>
    )
  }

  function renderVendors() {
    const canManage = hasPermission(user, 'vendor_manage')
    return (
      <section className="panel">
        <PanelHeader title="Nhà cung cấp" action={canManage} onAdd={() => setModal({ type: 'vendor', mode: 'create' })} />
        <DataTable
          data={vendors}
          getRowKey={(item) => item.id}
          emptyText="Chưa có nhà cung cấp"
          columns={[
            { key: 'name', title: 'Tên', render: (item) => <strong>{item.name}</strong> },
            { key: 'tax', title: 'Mã số thuế', render: (item) => item.taxCode || '—' },
            { key: 'contact', title: 'Liên hệ', render: (item) => item.contactName || item.email || '—' },
            { key: 'phone', title: 'Điện thoại', render: (item) => item.phone || '—' },
            { key: 'status', title: 'Trạng thái', render: (item) => <StatusBadge value={item.status} /> },
            { key: 'actions', title: '', render: (item) => canManage && <RowActions onEdit={() => setModal({ type: 'vendor', mode: 'edit', item })} onDelete={() => handleDelete('vendors', item.id)} /> },
          ]}
        />
      </section>
    )
  }

  function renderRequests() {
    const canCreate = hasPermission(user, 'purchase_request_create')
    const canApprove = hasPermission(user, 'purchase_request_approve')
    return (
      <section className="panel">
        <PanelHeader title="Đề nghị mua sắm" action={canCreate} onAdd={() => setModal({ type: 'request', mode: 'create' })} />
        <DataTable
          data={requests}
          getRowKey={(item) => item.id}
          emptyText="Chưa có đề nghị mua sắm"
          columns={[
            { key: 'title', title: 'Tiêu đề', render: (item) => <strong>{item.title}</strong> },
            { key: 'type', title: 'Loại', render: (item) => item.requestType },
            { key: 'cost', title: 'Dự kiến', render: (item) => money.format(Number(item.estimatedCost || 0)) },
            { key: 'date', title: 'Ngày cần', render: (item) => item.neededDate || '—' },
            { key: 'status', title: 'Trạng thái', render: (item) => <StatusBadge value={item.status} /> },
            {
              key: 'actions',
              title: '',
              render: (item) => (
                <div className="row-actions">
                  {canApprove && item.status !== 'APPROVED' && <button className="mini success" onClick={() => handleApproveRequest(item.id, 'APPROVED')}>Duyệt</button>}
                  {canApprove && item.status !== 'REJECTED' && <button className="mini danger" onClick={() => handleApproveRequest(item.id, 'REJECTED')}>Từ chối</button>}
                  {canApprove && <RowActions onEdit={() => setModal({ type: 'request', mode: 'edit', item })} onDelete={() => handleDelete('requests', item.id)} />}
                </div>
              ),
            },
          ]}
        />
      </section>
    )
  }

  function renderContracts() {
    const canManage = hasPermission(user, 'contract_manage')
    return (
      <section className="panel">
        <PanelHeader title="Hợp đồng mua sắm" action={canManage} onAdd={() => setModal({ type: 'contract', mode: 'create' })} />
        <DataTable
          data={contracts}
          getRowKey={(item) => item.id}
          emptyText="Chưa có hợp đồng nào"
          columns={[
            { key: 'number', title: 'Số HĐ', render: (item) => <strong>{item.contractNumber}</strong> },
            { key: 'title', title: 'Tiêu đề', render: (item) => item.title },
            { key: 'vendor', title: 'Nhà cung cấp', render: (item) => item.vendor?.name || '—' },
            { key: 'value', title: 'Giá trị', render: (item) => money.format(Number(item.contractValue || 0)) },
            { key: 'signDate', title: 'Ngày ký', render: (item) => item.signDate || '—' },
            { key: 'effectiveTo', title: 'Hiệu lực đến', render: (item) => item.effectiveTo || '—' },
            { key: 'status', title: 'Trạng thái', render: (item) => <StatusBadge value={item.status} /> },
            {
              key: 'actions',
              title: '',
              render: (item) => canManage ? (
                <RowActions onEdit={() => setModal({ type: 'contract', mode: 'edit', item })} onDelete={() => handleDelete('contracts', item.id)} />
              ) : null,
            },
          ]}
        />
      </section>
    )
  }

  async function revokeAsset(item: AssetItem) {
    setSubmitting(true)
    setError('')
    try {
      await updateAsset(item.id, {
        ...assetToPayload(item),
        assignedEmployeeId: null,
        status: 'IN_STOCK',
      })
      await refreshData()
    } catch (err) {
      setError(readError(err))
    } finally {
      setSubmitting(false)
    }
  }
}

function Operation({ icon, label, value }: { icon: ReactElement; label: string; value: string | number }) {
  return <div className="operation-card">{icon}<div><span>{label}</span><strong>{value}</strong></div></div>
}

function PanelHeader({ title, action, onAdd }: { title: string; action: boolean; onAdd: () => void }) {
  return (
    <div className="panel-title">
      <div><h2>{title}</h2><p>Danh sách dữ liệu thật từ backend QLVT</p></div>
      {action && <button onClick={onAdd}><FiPlus /> Thêm mới</button>}
    </div>
  )
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="row-actions">
      <button className="mini" onClick={onEdit}><FiEdit2 /> Sửa</button>
      <button className="mini danger" onClick={onDelete}><FiTrash2 /> Xóa</button>
    </div>
  )
}

function AssetActions({ item, onEdit, onDelete, onRevoke }: { item: AssetItem; onEdit: () => void; onDelete: () => void; onRevoke: () => void }) {
  return (
    <div className="row-actions">
      {item.assignedEmployeeId && <button className="mini success" onClick={onRevoke}>Thu hồi</button>}
      <button className="mini" onClick={onEdit}><FiEdit2 /> Sửa</button>
      <button className="mini danger" onClick={onDelete}><FiTrash2 /> Xóa</button>
    </div>
  )
}

function SeatUsage({ subscription }: { subscription: Subscription }) {
  const total = Number(subscription.totalSeats || 0)
  const used = Number(subscription.usedSeats || 0)
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  return (
    <div className="seat-usage">
      <span>{used}/{total}</span>
      <div><i style={{ width: `${percent}%` }} /></div>
    </div>
  )
}

function CrudForm({
  modal,
  vendors,
  employees,
  departments,
  workSites,
  projects,
  submitting,
  onClose,
  onSubmit,
}: {
  modal: NonNullable<ModalState>
  vendors: Vendor[]
  employees: EmployeeLite[]
  departments: DepartmentLite[]
  workSites: WorkSiteLite[]
  projects: ProjectLite[]
  submitting: boolean
  onClose: () => void
  onSubmit: (payload: VendorPayload | AssetPayload | SubscriptionPayload | PurchaseRequestPayload | ContractPayload) => void
}) {
  const [form, setForm] = useState<Record<string, string>>(() => initialForm(modal))
  const setField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }))
  const titlePrefix = modal.mode === 'create' ? 'Thêm' : 'Cập nhật'

  function submit(event: FormEvent) {
    event.preventDefault()
    if (modal.type === 'vendor') onSubmit({
      name: form.name,
      taxCode: empty(form.taxCode),
      contactName: empty(form.contactName),
      email: empty(form.email),
      phone: empty(form.phone),
      address: empty(form.address),
      status: form.status || 'ACTIVE',
    })
    if (modal.type === 'asset') onSubmit({
      assetCode: form.assetCode,
      name: form.name,
      category: form.category,
      serialNumber: empty(form.serialNumber),
      source: empty(form.source),
      vendorId: num(form.vendorId),
      assignedEmployeeId: num(form.assignedEmployeeId),
      departmentId: num(form.departmentId),
      siteId: num(form.siteId),
      projectId: num(form.projectId),
      purchaseCost: num(form.purchaseCost),
      residualValue: num(form.residualValue),
      purchaseDate: empty(form.purchaseDate),
      warrantyUntil: empty(form.warrantyUntil),
      status: form.status || 'IN_STOCK',
      notes: empty(form.notes),
    })
    if (modal.type === 'subscription') onSubmit({
      softwareName: form.softwareName,
      planName: empty(form.planName),
      vendorId: num(form.vendorId),
      totalSeats: num(form.totalSeats) || 1,
      usedSeats: num(form.usedSeats) || 0,
      cost: num(form.cost),
      billingCycle: empty(form.billingCycle),
      startDate: empty(form.startDate),
      renewalDate: empty(form.renewalDate),
      status: form.status || 'ACTIVE',
      notes: empty(form.notes),
    })
    if (modal.type === 'request') onSubmit({
      requestType: form.requestType,
      title: form.title,
      reason: empty(form.reason),
      estimatedCost: num(form.estimatedCost),
      requesterEmployeeId: num(form.requesterEmployeeId),
      departmentId: num(form.departmentId),
      siteId: num(form.siteId),
      projectId: num(form.projectId),
      neededDate: empty(form.neededDate),
      status: form.status || 'PENDING',
      notes: empty(form.notes),
    })
    if (modal.type === 'contract') onSubmit({
      contractNumber: form.contractNumber,
      title: form.title,
      vendorId: num(form.vendorId),
      signDate: empty(form.signDate),
      effectiveFrom: empty(form.effectiveFrom),
      effectiveTo: empty(form.effectiveTo),
      contractValue: num(form.contractValue),
      currency: form.currency || 'VND',
      paymentTerms: empty(form.paymentTerms),
      status: form.status || 'DRAFT',
      attachmentUrl: empty(form.attachmentUrl),
      notes: empty(form.notes),
    })
  }

  return (
    <CrudModal title={`${titlePrefix} ${modalLabel(modal.type)}`} subtitle="Nhập thông tin theo nghiệp vụ QLVT" submitting={submitting} onClose={onClose} onSubmit={submit}>
      {modal.type === 'vendor' && <>
        <Field label="Tên nhà cung cấp" value={form.name} onChange={(value) => setField('name', value)} required />
        <Field label="Mã số thuế" value={form.taxCode} onChange={(value) => setField('taxCode', value)} />
        <Field label="Người liên hệ" value={form.contactName} onChange={(value) => setField('contactName', value)} />
        <Field label="Email" value={form.email} onChange={(value) => setField('email', value)} type="email" />
        <Field label="Điện thoại" value={form.phone} onChange={(value) => setField('phone', value)} />
        <Field label="Địa chỉ" value={form.address} onChange={(value) => setField('address', value)} />
        <Select label="Trạng thái" value={form.status} onChange={(value) => setField('status', value)} options={[['ACTIVE', 'Đang hoạt động'], ['INACTIVE', 'Ngưng hoạt động']]} />
      </>}
      {modal.type === 'asset' && <>
        <Field label="Mã tài sản" value={form.assetCode} onChange={(value) => setField('assetCode', value)} required />
        <Field label="Tên tài sản" value={form.name} onChange={(value) => setField('name', value)} required />
        <Field label="Nhóm tài sản" value={form.category} onChange={(value) => setField('category', value)} required />
        <Field label="Serial" value={form.serialNumber} onChange={(value) => setField('serialNumber', value)} />
        <VendorSelect vendors={vendors} value={form.vendorId} onChange={(value) => setField('vendorId', value)} />
        <EmployeeSelect employees={employees} value={form.assignedEmployeeId} onChange={(value) => {
          setField('assignedEmployeeId', value)
          setField('status', value ? 'ASSIGNED' : 'IN_STOCK')
        }} />
        <DepartmentSelect departments={departments} value={form.departmentId} onChange={(value) => setField('departmentId', value)} />
        <WorkSiteSelect workSites={workSites} value={form.siteId} onChange={(value) => setField('siteId', value)} />
        <ProjectSelect projects={projects} value={form.projectId} onChange={(value) => setField('projectId', value)} />
        <Field label="Giá mua" value={form.purchaseCost} onChange={(value) => setField('purchaseCost', value)} type="number" />
        <Field label="Giá trị còn lại" value={form.residualValue} onChange={(value) => setField('residualValue', value)} type="number" />
        <Field label="Ngày mua" value={form.purchaseDate} onChange={(value) => setField('purchaseDate', value)} type="date" />
        <Field label="Bảo hành đến" value={form.warrantyUntil} onChange={(value) => setField('warrantyUntil', value)} type="date" />
        <Select label="Trạng thái" value={form.status} onChange={(value) => setField('status', value)} options={[['IN_STOCK', 'Trong kho'], ['ASSIGNED', 'Đã cấp phát'], ['MAINTENANCE', 'Bảo trì'], ['LIQUIDATED', 'Đã thanh lý']]} />
        <Field label="Ghi chú" value={form.notes} onChange={(value) => setField('notes', value)} />
      </>}
      {modal.type === 'subscription' && <>
        <Field label="Tên phần mềm" value={form.softwareName} onChange={(value) => setField('softwareName', value)} required />
        <Field label="Gói" value={form.planName} onChange={(value) => setField('planName', value)} />
        <VendorSelect vendors={vendors} value={form.vendorId} onChange={(value) => setField('vendorId', value)} />
        <Field label="Tổng seat" value={form.totalSeats} onChange={(value) => setField('totalSeats', value)} type="number" />
        <Field label="Đã dùng" value={form.usedSeats} onChange={(value) => setField('usedSeats', value)} type="number" />
        <Field label="Chi phí" value={form.cost} onChange={(value) => setField('cost', value)} type="number" />
        <Field label="Chu kỳ thanh toán" value={form.billingCycle} onChange={(value) => setField('billingCycle', value)} />
        <Field label="Ngày bắt đầu" value={form.startDate} onChange={(value) => setField('startDate', value)} type="date" />
        <Field label="Ngày gia hạn" value={form.renewalDate} onChange={(value) => setField('renewalDate', value)} type="date" />
        <Select label="Trạng thái" value={form.status} onChange={(value) => setField('status', value)} options={[['ACTIVE', 'Đang hoạt động'], ['INACTIVE', 'Ngưng hoạt động']]} />
        <Field label="Ghi chú" value={form.notes} onChange={(value) => setField('notes', value)} />
      </>}
      {modal.type === 'request' && <>
        <Field label="Tiêu đề" value={form.title} onChange={(value) => setField('title', value)} required />
        <Select label="Loại đề nghị" value={form.requestType} onChange={(value) => setField('requestType', value)} options={[['DEVICE', 'Thiết bị'], ['SUPPLY', 'Vật tư'], ['OFFICE', 'Văn phòng phẩm'], ['SOFTWARE', 'Phần mềm']]} />
        <Field label="Lý do" value={form.reason} onChange={(value) => setField('reason', value)} />
        <Field label="Chi phí dự kiến" value={form.estimatedCost} onChange={(value) => setField('estimatedCost', value)} type="number" />
        <EmployeeSelect employees={employees} value={form.requesterEmployeeId} onChange={(value) => setField('requesterEmployeeId', value)} />
        <DepartmentSelect departments={departments} value={form.departmentId} onChange={(value) => setField('departmentId', value)} />
        <WorkSiteSelect workSites={workSites} value={form.siteId} onChange={(value) => setField('siteId', value)} />
        <ProjectSelect projects={projects} value={form.projectId} onChange={(value) => setField('projectId', value)} />
        <Field label="Ngày cần" value={form.neededDate} onChange={(value) => setField('neededDate', value)} type="date" />
        <Select label="Trạng thái" value={form.status} onChange={(value) => setField('status', value)} options={[['PENDING', 'Chờ duyệt'], ['APPROVED', 'Đã duyệt'], ['REJECTED', 'Từ chối'], ['DRAFT', 'Bản nháp']]} />
        <Field label="Ghi chú" value={form.notes} onChange={(value) => setField('notes', value)} />
      </>}
      {modal.type === 'contract' && <>
        <Field label="Số hợp đồng" value={form.contractNumber} onChange={(value) => setField('contractNumber', value)} required />
        <Field label="Tiêu đề" value={form.title} onChange={(value) => setField('title', value)} required />
        <VendorSelect vendors={vendors} value={form.vendorId} onChange={(value) => setField('vendorId', value)} />
        <Field label="Giá trị hợp đồng" value={form.contractValue} onChange={(value) => setField('contractValue', value)} type="number" />
        <Select label="Tiền tệ" value={form.currency} onChange={(value) => setField('currency', value)} options={[['VND', 'VND'], ['USD', 'USD'], ['EUR', 'EUR']]} />
        <Field label="Ngày ký" value={form.signDate} onChange={(value) => setField('signDate', value)} type="date" />
        <Field label="Hiệu lực từ" value={form.effectiveFrom} onChange={(value) => setField('effectiveFrom', value)} type="date" />
        <Field label="Hiệu lực đến" value={form.effectiveTo} onChange={(value) => setField('effectiveTo', value)} type="date" />
        <Field label="Điều khoản thanh toán" value={form.paymentTerms} onChange={(value) => setField('paymentTerms', value)} />
        <Field label="URL file đính kèm" value={form.attachmentUrl} onChange={(value) => setField('attachmentUrl', value)} />
        <Select label="Trạng thái" value={form.status} onChange={(value) => setField('status', value)} options={[['DRAFT', 'Bản nháp'], ['ACTIVE', 'Đang hiệu lực'], ['EXPIRED', 'Hết hạn'], ['TERMINATED', 'Đã hủy'], ['COMPLETED', 'Hoàn thành']]} />
        <Field label="Ghi chú" value={form.notes} onChange={(value) => setField('notes', value)} />
      </>}
    </CrudModal>
  )
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value?: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label>{label}<input value={value || ''} onChange={(event) => onChange(event.target.value)} type={type} required={required} /></label>
}

function Select({ label, value, onChange, options }: { label: string; value?: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <label>{label}<select value={value || options[0]?.[0] || ''} onChange={(event) => onChange(event.target.value)}>{options.map(([key, labelText]) => <option key={key} value={key}>{labelText}</option>)}</select></label>
}

function VendorSelect({ vendors, value, onChange }: { vendors: Vendor[]; value?: string; onChange: (value: string) => void }) {
  return <label>Nhà cung cấp<select value={value || ''} onChange={(event) => onChange(event.target.value)}><option value="">Không chọn</option>{vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
}

function EmployeeSelect({ employees, value, onChange }: { employees: EmployeeLite[]; value?: string; onChange: (value: string) => void }) {
  return <label>Nhân viên sử dụng<select value={value || ''} onChange={(event) => onChange(event.target.value)}><option value="">Không gán</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>)}</select></label>
}

function DepartmentSelect({ departments, value, onChange }: { departments: DepartmentLite[]; value?: string; onChange: (value: string) => void }) {
  return <label>Phòng ban<select value={value || ''} onChange={(event) => onChange(event.target.value)}><option value="">Không chọn</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
}

function WorkSiteSelect({ workSites, value, onChange }: { workSites: WorkSiteLite[]; value?: string; onChange: (value: string) => void }) {
  return <label>Site làm việc<select value={value || ''} onChange={(event) => onChange(event.target.value)}><option value="">Không chọn</option>{workSites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
}

function ProjectSelect({ projects, value, onChange }: { projects: ProjectLite[]; value?: string; onChange: (value: string) => void }) {
  return <label>Dự án CDS<select value={value || ''} onChange={(event) => onChange(event.target.value)}><option value="">Không chọn</option>{projects.map((project) => <option key={project.id} value={project.id}>{projectLabel(project)}</option>)}</select></label>
}

function initialForm(modal: NonNullable<ModalState>): Record<string, string> {
  if (modal.type === 'vendor') return {
    name: modal.item?.name || '',
    taxCode: modal.item?.taxCode || '',
    contactName: modal.item?.contactName || '',
    email: modal.item?.email || '',
    phone: modal.item?.phone || '',
    address: modal.item?.address || '',
    status: modal.item?.status || 'ACTIVE',
  }
  if (modal.type === 'asset') return {
    assetCode: modal.item?.assetCode || '',
    name: modal.item?.name || '',
    category: modal.item?.category || '',
    serialNumber: modal.item?.serialNumber || '',
    source: modal.item?.source || '',
    vendorId: modal.item?.vendor?.id ? String(modal.item.vendor.id) : '',
    assignedEmployeeId: val(modal.item?.assignedEmployeeId),
    departmentId: val(modal.item?.departmentId),
    siteId: val(modal.item?.siteId),
    projectId: val(modal.item?.projectId),
    purchaseCost: val(modal.item?.purchaseCost),
    residualValue: val(modal.item?.residualValue),
    purchaseDate: modal.item?.purchaseDate || '',
    warrantyUntil: modal.item?.warrantyUntil || '',
    status: modal.item?.status || 'IN_STOCK',
    notes: '',
  }
  if (modal.type === 'subscription') return {
    softwareName: modal.item?.softwareName || '',
    planName: modal.item?.planName || '',
    vendorId: modal.item?.vendor?.id ? String(modal.item.vendor.id) : '',
    totalSeats: val(modal.item?.totalSeats || 1),
    usedSeats: val(modal.item?.usedSeats || 0),
    cost: val(modal.item?.cost),
    billingCycle: modal.item?.billingCycle || '',
    startDate: '',
    renewalDate: modal.item?.renewalDate || '',
    status: modal.item?.status || 'ACTIVE',
    notes: '',
  }
  if (modal.type === 'request') return {
    requestType: modal.item?.requestType || 'DEVICE',
    title: modal.item?.title || '',
    reason: modal.item?.reason || '',
    estimatedCost: val(modal.item?.estimatedCost),
    requesterEmployeeId: val(modal.item?.requesterEmployeeId),
    departmentId: '',
    siteId: '',
    projectId: '',
    neededDate: modal.item?.neededDate || '',
    status: modal.item?.status || 'PENDING',
    notes: '',
  }
  return {
    contractNumber: modal.item?.contractNumber || '',
    title: modal.item?.title || '',
    vendorId: modal.item?.vendor?.id ? String(modal.item.vendor.id) : '',
    contractValue: val(modal.item?.contractValue),
    currency: modal.item?.currency || 'VND',
    signDate: modal.item?.signDate || '',
    effectiveFrom: modal.item?.effectiveFrom || '',
    effectiveTo: modal.item?.effectiveTo || '',
    paymentTerms: modal.item?.paymentTerms || '',
    attachmentUrl: modal.item?.attachmentUrl || '',
    status: modal.item?.status || 'DRAFT',
    notes: modal.item?.notes || '',
  }
}

function modalLabel(type: NonNullable<ModalState>['type']) {
  return ({ vendor: 'nhà cung cấp', asset: 'tài sản', subscription: 'subscription', request: 'đề nghị mua sắm', contract: 'hợp đồng' })[type]
}

function empty(value?: string) {
  return value?.trim() || undefined
}

function num(value?: string) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function val(value?: string | number | null) {
  return value == null ? '' : String(value)
}

function employeeLabel(employee?: EmployeeLite) {
  if (!employee) return '—'
  const name = employee.fullName || employee.name || `Nhân viên #${employee.id}`
  return employee.employeeCode ? `${name} · ${employee.employeeCode}` : name
}

function projectLabel(project?: ProjectLite) {
  if (!project) return '—'
  return project.code ? `${project.code} · ${project.name}` : project.name
}

function assetToPayload(item: AssetItem): AssetPayload {
  return {
    assetCode: item.assetCode,
    name: item.name,
    category: item.category,
    serialNumber: item.serialNumber,
    source: item.source,
    vendorId: item.vendor?.id || null,
    assignedEmployeeId: item.assignedEmployeeId || null,
    departmentId: item.departmentId || null,
    siteId: item.siteId || null,
    projectId: item.projectId || null,
    purchaseCost: item.purchaseCost || null,
    residualValue: item.residualValue || null,
    purchaseDate: item.purchaseDate,
    warrantyUntil: item.warrantyUntil,
    status: item.status,
  }
}

function readError(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message || 'Không thể xử lý yêu cầu'
  }
  return 'Không thể xử lý yêu cầu'
}

export default App
