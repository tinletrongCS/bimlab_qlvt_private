import { DataTable } from "../components/DataTable";
import { PanelHeader } from "../components/PanelHeader";
import { RowActions } from "../components/RowActions";
import { StatusBadge } from "../components/StatusBadge";
import { useActions } from "../contexts/ActionsContext";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";

export function VendorsPage() {
  const { hasPermission } = useAuth();
  const { vendors } = useAppData();
  const { openModal, deleteResource } = useActions();

  const canManage = hasPermission("vendor_manage");

  return (
    <section className="panel">
      <PanelHeader
        title="Nhà cung cấp"
        action={canManage}
        onAdd={() => openModal({ type: "vendor", mode: "create" })}
      />
      <DataTable
        data={vendors}
        getRowKey={(item) => item.id}
        emptyText="Chưa có nhà cung cấp"
        columns={[
          { key: "name", title: "Tên", render: (item) => <strong>{item.name}</strong> },
          { key: "tax", title: "Mã số thuế", render: (item) => item.taxCode || "—" },
          {
            key: "contact",
            title: "Liên hệ",
            render: (item) => item.contactName || item.email || "—",
          },
          { key: "phone", title: "Điện thoại", render: (item) => item.phone || "—" },
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
                <RowActions
                  onEdit={() => openModal({ type: "vendor", mode: "edit", item })}
                  onDelete={() => void deleteResource("vendors", item.id)}
                />
              ),
          },
        ]}
      />
    </section>
  );
}
