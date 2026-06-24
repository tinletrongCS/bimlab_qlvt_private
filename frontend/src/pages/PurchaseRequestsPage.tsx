import { useEffect } from "react";
import { DataTable } from "../components/DataTable";
import { PanelHeader } from "../components/PanelHeader";
import { RowActions } from "../components/RowActions";
import { StatusBadge } from "../components/StatusBadge";
import { useActions } from "../contexts/ActionsContext";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import { money } from "../lib/format";

export function PurchaseRequestsPage() {
  const { hasPermission } = useAuth();
  const { requests, ensureRequests } = useAppData();
  const { openModal, deleteResource, approveRequest } = useActions();

  useEffect(() => {
    void ensureRequests();
  }, [ensureRequests]);

  const canCreate = hasPermission("purchase_request_create");
  const canApprove = hasPermission("purchase_request_approve");

  return (
    <section className="panel">
      <PanelHeader
        title="Đề nghị mua sắm"
        action={canCreate}
        onAdd={() => openModal({ type: "request", mode: "create" })}
      />
      <DataTable
        data={requests}
        getRowKey={(item) => item.id}
        emptyText="Chưa có đề nghị mua sắm"
        columns={[
          { key: "title", title: "Tiêu đề", render: (item) => <strong>{item.title}</strong> },
          { key: "type", title: "Loại", render: (item) => item.requestType },
          {
            key: "cost",
            title: "Dự kiến",
            render: (item) => money.format(Number(item.estimatedCost || 0)),
          },
          { key: "date", title: "Ngày cần", render: (item) => item.neededDate || "—" },
          {
            key: "status",
            title: "Trạng thái",
            render: (item) => <StatusBadge value={item.status} />,
          },
          {
            key: "actions",
            title: "",
            render: (item) => (
              <div className="row-actions">
                {canApprove && item.status !== "APPROVED" && (
                  <button
                    type="button"
                    className="mini success"
                    onClick={() => void approveRequest(item.id, "APPROVED")}
                  >
                    Duyệt
                  </button>
                )}
                {canApprove && item.status !== "REJECTED" && (
                  <button
                    type="button"
                    className="mini danger"
                    onClick={() => void approveRequest(item.id, "REJECTED")}
                  >
                    Từ chối
                  </button>
                )}
                {canApprove && (
                  <RowActions
                    onEdit={() => openModal({ type: "request", mode: "edit", item })}
                    onDelete={() => void deleteResource("requests", item.id)}
                  />
                )}
              </div>
            ),
          },
        ]}
      />
    </section>
  );
}
