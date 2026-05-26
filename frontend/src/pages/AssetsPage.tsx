import { AssetActions } from "../components/AssetActions";
import { DataTable } from "../components/DataTable";
import { PanelHeader } from "../components/PanelHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useActions } from "../contexts/ActionsContext";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import { employeeLabel, money, projectLabel } from "../lib/format";

export function AssetsPage() {
  const { hasPermission } = useAuth();
  const { assets, employees, departments, workSites, projects } = useAppData();
  const { openModal, deleteResource, disposeAssetAction, revokeAsset } = useActions();

  const canManage = hasPermission("asset_manage");
  const employeeName = (id?: number) =>
    id ? employeeLabel(employees.find((employee) => employee.id === id)) : "Trong kho";
  const departmentName = (id?: number) =>
    id ? departments.find((department) => department.id === id)?.name || `Phòng ban #${id}` : "—";
  const siteName = (id?: number) =>
    id ? workSites.find((site) => site.id === id)?.name || `Site #${id}` : "—";
  const projectName = (id?: number) =>
    id ? projectLabel(projects.find((project) => project.id === id)) : "—";

  return (
    <section className="panel">
      <PanelHeader
        title="Danh sách tài sản"
        action={canManage}
        onAdd={() => openModal({ type: "asset", mode: "create" })}
      />
      <DataTable
        data={assets}
        getRowKey={(item) => item.id}
        emptyText="Chưa có tài sản"
        columns={[
          { key: "code", title: "Mã", render: (item) => item.assetCode },
          { key: "name", title: "Tên tài sản", render: (item) => <strong>{item.name}</strong> },
          { key: "category", title: "Nhóm", render: (item) => item.category },
          { key: "vendor", title: "Nhà cung cấp", render: (item) => item.vendor?.name || "—" },
          {
            key: "owner",
            title: "Người dùng",
            render: (item) => (
              <span className="muted-cell">{employeeName(item.assignedEmployeeId)}</span>
            ),
          },
          {
            key: "scope",
            title: "Liên kết",
            render: (item) => (
              <span className="muted-cell">
                {departmentName(item.departmentId)} · {siteName(item.siteId)} ·{" "}
                {projectName(item.projectId)}
              </span>
            ),
          },
          {
            key: "value",
            title: "Giá trị",
            render: (item) => money.format(Number(item.purchaseCost || 0)),
          },
          {
            key: "status",
            title: "Trạng thái",
            render: (item) => <StatusBadge value={item.status} />,
          },
          {
            key: "actions",
            title: "",
            render: (item) =>
              canManage && (
                <AssetActions
                  item={item}
                  onEdit={() => openModal({ type: "asset", mode: "edit", item })}
                  onDelete={() => void deleteResource("assets", item.id)}
                  onRevoke={() => void revokeAsset(item)}
                  onDispose={() => void disposeAssetAction(item)}
                />
              ),
          },
        ]}
      />
    </section>
  );
}
