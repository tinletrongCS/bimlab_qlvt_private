import { useEffect } from "react";
import { DataTable } from "../components/DataTable";
import { PanelHeader } from "../components/PanelHeader";
import { RowActions } from "../components/RowActions";
import { StatusBadge } from "../components/StatusBadge";
import { useActions } from "../contexts/ActionsContext";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import { money } from "../lib/format";

export function MaintenancePage() {
  const { hasPermission } = useAuth();
  const { maintenanceRecords, ensureMaintenance } = useAppData();
  const { openModal, deleteResource } = useActions();

  useEffect(() => {
    void ensureMaintenance();
  }, [ensureMaintenance]);

  const canManage = hasPermission("maintenance_manage");

  return (
    <section className="panel">
      <PanelHeader
        title="Tài sản đang được bảo trì"
        action={canManage}
        onAdd={() => openModal({ type: "maintenance", mode: "create" })}
      />
      <DataTable
        data={maintenanceRecords}
        getRowKey={(item) => item.id}
        emptyText="Chưa có bản ghi bảo trì"
        columns={[
          {
            key: "asset",
            title: "Tài sản",
            render: (item) => (
              <strong>
                {item.asset?.assetCode} · {item.asset?.name}
              </strong>
            ),
          },
          { key: "type", title: "Loại", render: (item) => item.maintenanceType },
          { key: "date", title: "Ngày bảo trì", render: (item) => item.maintenanceDate },
          { key: "cost", title: "Chi phí", render: (item) => money.format(Number(item.cost || 0)) },
          {
            key: "vendor",
            title: "Nhà cung cấp",
            render: (item) => item.vendor?.name || item.performedBy || "—",
          },
          {
            key: "next",
            title: "Lần tiếp theo",
            render: (item) => item.nextMaintenanceDate || "—",
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
              canManage ? (
                <RowActions
                  onEdit={() => openModal({ type: "maintenance", mode: "edit", item })}
                  onDelete={() => void deleteResource("maintenance", item.id)}
                />
              ) : null,
          },
        ]}
      />
    </section>
  );
}
