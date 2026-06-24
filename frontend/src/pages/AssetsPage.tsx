import { type ReactNode, useEffect, useMemo, useState } from "react";
import { FiArchive, FiBox, FiSearch, FiTool, FiUserCheck } from "react-icons/fi";
import { AssetActions } from "../components/AssetActions";
import { PanelHeader } from "../components/PanelHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useActions } from "../contexts/ActionsContext";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import { employeeLabel, money, projectLabel } from "../lib/format";

type AssetStatusFilter = "ALL" | "IN_STOCK" | "ASSIGNED" | "MAINTENANCE" | "DISPOSED";

function statusLabel(status: AssetStatusFilter) {
  const labels: Record<AssetStatusFilter, string> = {
    ALL: "Tất cả trạng thái",
    IN_STOCK: "Trong kho",
    ASSIGNED: "Đã cấp phát",
    MAINTENANCE: "Bảo trì",
    DISPOSED: "Đã thanh lý",
  };
  return labels[status];
}

function AssetMetric({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`asset-metric ${accent ? "accent" : ""}`}>
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export function AssetsPage() {
  const { hasPermission } = useAuth();
  const { assets, employees, departments, workSites, projects, ensureAssets } = useAppData();
  const { openModal, deleteResource, disposeAssetAction, revokeAsset } = useActions();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssetStatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  useEffect(() => {
    void ensureAssets();
  }, [ensureAssets]);

  const canManage = hasPermission("asset_manage");
  const employeeName = (id?: number) =>
    id ? employeeLabel(employees.find((employee) => employee.id === id)) : "Trong kho";
  const departmentName = (id?: number) =>
    id ? departments.find((department) => department.id === id)?.name || `Phòng ban #${id}` : "—";
  const siteName = (id?: number) =>
    id ? workSites.find((site) => site.id === id)?.name || `Site #${id}` : "—";
  const projectName = (id?: number) =>
    id ? projectLabel(projects.find((project) => project.id === id)) : "—";

  const categories = useMemo(
    () =>
      Array.from(new Set(assets.map((asset) => asset.category).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "vi"),
      ),
    [assets],
  );

  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesStatus = statusFilter === "ALL" || asset.status === statusFilter;
      const matchesCategory = categoryFilter === "ALL" || asset.category === categoryFilter;
      const searchable = [
        asset.assetCode,
        asset.name,
        asset.category,
        asset.serialNumber,
        asset.vendor?.name,
        employeeName(asset.assignedEmployeeId),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalized || searchable.includes(normalized);
      return matchesStatus && matchesCategory && matchesQuery;
    });
  }, [assets, categoryFilter, query, statusFilter]);

  const totalValue = useMemo(
    () => assets.reduce((sum, item) => sum + Number(item.purchaseCost || 0), 0),
    [assets],
  );

  const assignedCount = assets.filter((asset) => asset.status === "ASSIGNED").length;
  const inStockCount = assets.filter((asset) => asset.status === "IN_STOCK").length;
  const maintenanceCount = assets.filter((asset) => asset.status === "MAINTENANCE").length;

  return (
    <section className="asset-page panel">
      <PanelHeader
        title="Danh sách tài sản"
        action={canManage}
        onAdd={() => openModal({ type: "asset", mode: "create" })}
      />

      <div className="asset-summary-grid">
        <AssetMetric label="Tổng tài sản" value={assets.length} icon={<FiBox />} accent />
        <AssetMetric label="Đã cấp phát" value={assignedCount} icon={<FiUserCheck />} />
        <AssetMetric label="Trong kho" value={inStockCount} icon={<FiArchive />} />
        <AssetMetric label="Bảo trì" value={maintenanceCount} icon={<FiTool />} />
      </div>

      <div className="asset-toolbar">
        <label className="asset-search">
          <FiSearch />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo mã, tên, serial, nhà cung cấp..."
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as AssetStatusFilter)}
        >
          {(["ALL", "IN_STOCK", "ASSIGNED", "MAINTENANCE", "DISPOSED"] as const).map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="ALL">Tất cả nhóm tài sản</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="asset-list-panel">
        <div className="asset-list-head">
          <div>
            <strong>{filteredAssets.length} tài sản</strong>
            <span>Tổng giá trị: {money.format(totalValue)}</span>
          </div>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="empty-state">Không có tài sản phù hợp bộ lọc.</div>
        ) : (
          <div className="asset-table">
            <table>
              <thead>
                <tr>
                  <th>Tài sản</th>
                  <th>Phân loại</th>
                  <th>Người dùng</th>
                  <th>Vị trí</th>
                  <th>Giá trị</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="asset-name-cell">
                        <strong>{item.name}</strong>
                        <span>{item.assetCode}</span>
                        {item.serialNumber && <small>Serial: {item.serialNumber}</small>}
                      </div>
                    </td>
                    <td>
                      <div className="asset-muted-stack">
                        <strong>{item.category}</strong>
                        <span>{item.vendor?.name || "Chưa có nhà cung cấp"}</span>
                      </div>
                    </td>
                    <td>
                      <span className="muted-cell">{employeeName(item.assignedEmployeeId)}</span>
                    </td>
                    <td>
                      <div className="asset-muted-stack">
                        <span>{departmentName(item.departmentId)}</span>
                        <small>
                          {siteName(item.siteId)} · {projectName(item.projectId)}
                        </small>
                      </div>
                    </td>
                    <td>{money.format(Number(item.purchaseCost || 0))}</td>
                    <td>
                      <StatusBadge value={item.status} />
                    </td>
                    <td>
                      {canManage && (
                        <AssetActions
                          item={item}
                          onEdit={() => openModal({ type: "asset", mode: "edit", item })}
                          onDelete={() => void deleteResource("assets", item.id)}
                          onRevoke={() => void revokeAsset(item)}
                          onDispose={() => void disposeAssetAction(item)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
