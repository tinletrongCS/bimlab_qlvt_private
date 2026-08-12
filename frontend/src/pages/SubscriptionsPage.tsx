import { useEffect } from "react";
import { DataTable } from "../components/DataTable";
import { PanelHeader } from "../components/PanelHeader";
import { RowActions } from "../components/RowActions";
import { SeatUsage } from "../components/SeatUsage";
import { StatusBadge } from "../components/StatusBadge";
import { useActions } from "../contexts/ActionsContext";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";

export function SubscriptionsPage() {
  const { hasPermission } = useAuth();
  const { subscriptions, ensureSubscriptions } = useAppData();
  const { openModal, deleteResource } = useActions();

  useEffect(() => {
    void ensureSubscriptions();
  }, [ensureSubscriptions]);

  const canManage = hasPermission("subscription_manage");

  return (
    <section className="panel">
      <PanelHeader
        title="Gói đăng ký phần mềm"
        action={canManage}
        onAdd={() => openModal({ type: "subscription", mode: "create" })}
      />
      <DataTable
        data={subscriptions}
        getRowKey={(item) => item.id}
        emptyText="Chưa có subscription"
        columns={[
          {
            key: "name",
            title: "Phần mềm",
            render: (item) => <strong>{item.softwareName}</strong>,
          },
          { key: "plan", title: "Gói", render: (item) => item.planName || "--" },
          { key: "vendor", title: "Nhà cung cấp", render: (item) => item.vendor?.name || "--" },
          { key: "seat", title: "Seat", render: (item) => <SeatUsage subscription={item} /> },
          { key: "renewal", title: "Gia hạn", render: (item) => item.renewalDate || "--" },
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
                  onEdit={() => openModal({ type: "subscription", mode: "edit", item })}
                  onDelete={() => void deleteResource("subscriptions", item.id)}
                />
              ),
          },
        ]}
      />
    </section>
  );
}
