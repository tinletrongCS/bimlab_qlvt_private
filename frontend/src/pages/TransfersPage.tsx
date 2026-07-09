import { useEffect } from "react";
import { FiTrash2 } from "react-icons/fi";
import { DataTable } from "../components/DataTable";
import { PanelHeader } from "../components/PanelHeader";
import { useActions } from "../contexts/ActionsContext";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import { employeeLabel } from "../lib/format";

export function TransfersPage() {
  const { hasPermission } = useAuth();
  const { transfers, employees, ensureTransfers } = useAppData();
  const { openModal, deleteResource } = useActions();

  useEffect(() => {
    void ensureTransfers();
  }, [ensureTransfers]);

  const canManage = hasPermission("asset_manage");
  const empLabel = (id?: number) => (id ? employeeLabel(employees.find((e) => e.id === id)) : "--");

  return (
    <section className="panel">
      <PanelHeader
        title="Lịch sử luân chuyển tài sản"
        action={canManage}
        onAdd={() => openModal({ type: "transfer", mode: "create" })}
      />
      <DataTable
        data={transfers}
        getRowKey={(item) => item.id}
        emptyText="Chưa có bản ghi luân chuyển"
        columns={[
          { key: "date", title: "Ngày", render: (item) => item.transferDate },
          {
            key: "asset",
            title: "Tài sản",
            render: (item) => (
              <strong>
                {item.asset?.assetCode} · {item.asset?.name}
              </strong>
            ),
          },
          { key: "type", title: "Loại", render: (item) => item.transferType },
          {
            key: "from",
            title: "Từ",
            render: (item) => <span className="muted-cell">{empLabel(item.fromEmployeeId)}</span>,
          },
          {
            key: "to",
            title: "Đến",
            render: (item) => <span className="muted-cell">{empLabel(item.toEmployeeId)}</span>,
          },
          { key: "reason", title: "Lý do", render: (item) => item.reason || "--" },
          { key: "by", title: "Người ghi", render: (item) => item.performedBy || "--" },
          {
            key: "actions",
            title: "",
            render: (item) =>
              canManage ? (
                <button
                  type="button"
                  className="mini danger"
                  onClick={() => void deleteResource("transfers", item.id)}
                >
                  <FiTrash2 /> Xóa
                </button>
              ) : null,
          },
        ]}
      />
    </section>
  );
}
