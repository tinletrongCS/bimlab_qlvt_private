import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { SearchableSelect } from "../components/forms/SearchableSelect";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import { employeeLabel } from "../lib/format";
import { createTransfer } from "../services/api";

import type { AssetTransfer } from "../services/types";

interface TransferGroup {
  ticketId: string;
  transferDate: string;
  transferType: string;
  reason: string;
  status: string;
  assets: NonNullable<AssetTransfer["lines"]>;
  first: AssetTransfer;
}

export function TransfersPage() {
  const { hasPermission } = useAuth();
  const { transfers, employees, departments, workSites, assets, ensureTransfers, ensureAssets } =
    useAppData();

  const [view, setView] = useState<"list" | "create">("list");
  const [selectedTicket, setSelectedTicket] = useState<TransferGroup | null>(null);

  // Filters for list view
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Create form state
  const [transferType, setTransferType] = useState("Điều chuyển");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [fromEmployeeId, setFromEmployeeId] = useState("");
  const [toEmployeeId, setToEmployeeId] = useState("");
  const [fromDepartmentId, setFromDepartmentId] = useState("");
  const [toDepartmentId, setToDepartmentId] = useState("");
  const [fromSiteId, setFromSiteId] = useState("");
  const [toSiteId, setToSiteId] = useState("");
  const [reason, setReason] = useState("");
  const [performedBy, setPerformedBy] = useState("");

  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [assetSelector, setAssetSelector] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void ensureTransfers();
    if (view === "create") {
      void ensureAssets(false, true);
    }
  }, [ensureTransfers, ensureAssets, view]);

  const canManage = hasPermission(["asset_transfers_manage", "asset_manage"]);
  const empLabel = (id?: number) => (id ? employeeLabel(employees.find((e) => e.id === id)) : "--");
  const statusLabel = (status?: string) => {
    if (status === "APPROVED") return "Đã duyệt";
    if (status === "REJECTED") return "Từ chối";
    if (status === "CANCELLED") return "Đã hủy";
    if (status === "PENDING_APPROVAL") return "Chờ duyệt";
    return "Nháp";
  };

  const groupedTransfers = useMemo(() => {
    return transfers.map((first) => {
      return {
        ticketId: first.transferCode || `PBG-${first.id.toString().padStart(4, "0")}`,
        transferDate: first.transferDate,
        transferType: first.transferType,
        reason: first.reason ?? "",
        status: statusLabel(first.status),
        assets: first.lines ?? [],
        first,
      };
    });
  }, [transfers]);

  const filteredTransfers = useMemo(() => {
    return groupedTransfers.filter((t) => {
      if (filterType && t.transferType !== filterType) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterDate && t.transferDate !== filterDate) return false;
      if (searchQuery && !t.ticketId.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;
      return true;
    });
  }, [groupedTransfers, filterType, filterStatus, filterDate, searchQuery]);

  const handleSubmit = async () => {
    if (selectedAssetIds.length === 0) return toast.error("Vui lòng chọn ít nhất 1 tài sản");
    setIsSubmitting(true);
    try {
      await createTransfer({
        title: `${transferType} tài sản`,
        transferType,
        fromEmployeeId: fromEmployeeId ? Number(fromEmployeeId) : undefined,
        toEmployeeId: toEmployeeId ? Number(toEmployeeId) : undefined,
        fromDepartmentId: fromDepartmentId ? Number(fromDepartmentId) : undefined,
        toDepartmentId: toDepartmentId ? Number(toDepartmentId) : undefined,
        fromSiteId: fromSiteId ? Number(fromSiteId) : undefined,
        toSiteId: toSiteId ? Number(toSiteId) : undefined,
        transferDate,
        plannedHandoverAt: `${transferDate}T09:00:00`,
        reason,
        note: performedBy ? `Người thực hiện: ${performedBy}` : undefined,
        lines: selectedAssetIds.map((assetId) => ({ assetId })),
      });
      toast.success("Tạo phiếu bàn giao thành công!");
      setView("list");
      void ensureTransfers();
      // Reset form
      setSelectedAssetIds([]);
      setReason("");
      setFromEmployeeId("");
      setToEmployeeId("");
      setFromDepartmentId("");
      setToDepartmentId("");
      setFromSiteId("");
      setToSiteId("");
      setPerformedBy("");
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra khi tạo bàn giao.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div
        className="category-view-tabs"
        style={{ display: "inline-flex", gap: "8px", marginBottom: "20px" }}
      >
        <button
          type="button"
          className={view === "list" ? "active" : ""}
          onClick={() => {
            setView("list");
            setSelectedTicket(null);
          }}
        >
          Danh sách phiếu bàn giao
        </button>
        {canManage && (
          <button
            type="button"
            className={view === "create" ? "active" : ""}
            onClick={() => {
              setView("create");
              setSelectedTicket(null);
            }}
          >
            Tạo phiếu
          </button>
        )}
      </div>

      {view === "list" && (
        <section className="panel">
          <div className="panel-body" style={{ padding: "24px" }}>
            {/* Filters */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--qlvt-border, #e2e8f0)",
                  outline: "none",
                  minWidth: "180px",
                }}
              >
                <option value="">Tất cả phân loại</option>
                <option value="Điều chuyển">Điều chuyển</option>
                <option value="Cấp phát">Cấp phát</option>
                <option value="Thu hồi">Thu hồi</option>
                <option value="Bàn giao">Bàn giao</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--qlvt-border, #e2e8f0)",
                  outline: "none",
                  minWidth: "180px",
                }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Nháp">Nháp</option>
                <option value="Đã duyệt">Đã duyệt</option>
                <option value="Từ chối">Từ chối</option>
                <option value="Đã hủy">Đã hủy</option>
                <option value="Chờ duyệt">Chờ duyệt</option>
              </select>
              <input
                type="date"
                title="Ngày thực hiện"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--qlvt-border, #e2e8f0)",
                  outline: "none",
                }}
              />
            </div>
            <div style={{ marginBottom: "24px" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo Số quyết định (VD: PBG-0001)..."
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--qlvt-border, #e2e8f0)",
                  outline: "none",
                }}
              />
            </div>

            {/* List Table */}
            <div
              className="table-wrap"
              style={{
                border: "1px solid var(--qlvt-border, #e2e8f0)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <tr>
                    <th
                      style={{
                        padding: "12px 16px",
                        color: "#64748b",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      STT
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        color: "#64748b",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      Ngày quyết định
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        color: "#64748b",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      Số quyết định
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        color: "#64748b",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      Phân loại
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        color: "#64748b",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      Lý do
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        color: "#64748b",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      Ngày thực hiện
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        color: "#64748b",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      Xét duyệt
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        color: "#64748b",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      Ghi chú
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}
                      >
                        Không tìm thấy phiếu bàn giao nào phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredTransfers.map((ticket, index) => (
                      <tr
                        key={ticket.ticketId}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          cursor: "pointer",
                          background:
                            selectedTicket?.ticketId === ticket.ticketId ? "#f0f9ff" : undefined,
                        }}
                        onClick={() => setSelectedTicket(ticket)}
                        onMouseEnter={(e) => {
                          if (selectedTicket?.ticketId !== ticket.ticketId)
                            e.currentTarget.style.background = "#f8fafc";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            selectedTicket?.ticketId === ticket.ticketId
                              ? "#f0f9ff"
                              : "transparent";
                        }}
                      >
                        <td style={{ padding: "12px 16px", fontWeight: 500 }}>{index + 1}</td>
                        <td style={{ padding: "12px 16px" }}>{ticket.transferDate}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>{ticket.ticketId}</td>
                        <td style={{ padding: "12px 16px" }}>{ticket.transferType}</td>
                        <td style={{ padding: "12px 16px" }}>{ticket.reason || "--"}</td>
                        <td style={{ padding: "12px 16px" }}>{ticket.transferDate}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: 500,
                              background: ticket.status === "Đã duyệt" ? "#dcfce7" : "#fef3c7",
                              color: ticket.status === "Đã duyệt" ? "#166534" : "#92400e",
                            }}
                          >
                            {ticket.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>--</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Selected Ticket Details */}
            {selectedTicket && (
              <div style={{ marginTop: "40px" }}>
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    borderBottom: "2px solid #e2e8f0",
                    paddingBottom: "10px",
                    marginBottom: "20px",
                    color: "#0f172a",
                  }}
                >
                  Danh sách tài sản bàn giao/thu hồi ({selectedTicket.ticketId})
                </h3>
                <div
                  className="table-wrap"
                  style={{
                    border: "1px solid var(--qlvt-border, #e2e8f0)",
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <tr>
                        <th
                          style={{
                            padding: "12px 16px",
                            color: "#64748b",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        >
                          STT
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            color: "#64748b",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        >
                          Mã tài sản
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            color: "#64748b",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        >
                          Tên tài sản
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            color: "#64748b",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        >
                          Thông tin bàn giao
                        </th>
                        <th
                          style={{
                            padding: "12px 16px",
                            color: "#64748b",
                            fontSize: "13px",
                            fontWeight: 600,
                          }}
                        >
                          Ghi chú
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTicket.assets.map((assetTransfer, idx) => (
                        <tr
                          key={assetTransfer.id ?? assetTransfer.assetId}
                          style={{ borderBottom: "1px solid #f1f5f9" }}
                        >
                          <td style={{ padding: "12px 16px", fontWeight: 500 }}>{idx + 1}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: "#2563eb" }}>
                            {assetTransfer.assetCode || "--"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {assetTransfer.assetName || "--"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {selectedTicket.first.fromEmployeeId
                              ? empLabel(selectedTicket.first.fromEmployeeId)
                              : "Kho"}
                            {" -> "}
                            {selectedTicket.first.toEmployeeId
                              ? empLabel(selectedTicket.first.toEmployeeId)
                              : "Kho"}
                          </td>
                          <td style={{ padding: "12px 16px", color: "#64748b" }}>
                            {assetTransfer.receiverNote || selectedTicket.reason || "--"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {view === "create" && (
        <section className="panel">
          <div className="panel-body" style={{ padding: "24px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "20px",
                marginBottom: "32px",
              }}
            >
              <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                  Loại bàn giao
                </span>
                <SearchableSelect value={transferType} onChange={setTransferType}>
                  <option value="Điều chuyển">Điều chuyển</option>
                  <option value="Cấp phát">Cấp phát</option>
                  <option value="Thu hồi">Thu hồi</option>
                  <option value="Bàn giao">Bàn giao</option>
                </SearchableSelect>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                  Ngày bàn giao
                </span>
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--qlvt-border, #e2e8f0)",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                  Người thực hiện
                </span>
                <input
                  type="text"
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                  placeholder="Nhập tên..."
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--qlvt-border, #e2e8f0)",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                  Từ người giữ
                </span>
                <SearchableSelect value={fromEmployeeId} onChange={setFromEmployeeId}>
                  <option value="">Chọn người</option>
                  {employees.map((e) => (
                    <option key={e.id} value={String(e.id)}>
                      {employeeLabel(e)}
                    </option>
                  ))}
                </SearchableSelect>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                  Đến người giữ
                </span>
                <SearchableSelect value={toEmployeeId} onChange={setToEmployeeId}>
                  <option value="">Chọn người</option>
                  {employees.map((e) => (
                    <option key={e.id} value={String(e.id)}>
                      {employeeLabel(e)}
                    </option>
                  ))}
                </SearchableSelect>
              </label>
              <div />

              <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                  Từ phòng ban
                </span>
                <SearchableSelect value={fromDepartmentId} onChange={setFromDepartmentId}>
                  <option value="">Chọn phòng ban</option>
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name}
                    </option>
                  ))}
                </SearchableSelect>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                  Đến phòng ban
                </span>
                <SearchableSelect value={toDepartmentId} onChange={setToDepartmentId}>
                  <option value="">Chọn phòng ban</option>
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name}
                    </option>
                  ))}
                </SearchableSelect>
              </label>
              <div />

              <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                  Từ chi nhánh
                </span>
                <SearchableSelect value={fromSiteId} onChange={setFromSiteId}>
                  <option value="">Chọn chi nhánh</option>
                  {workSites.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </SearchableSelect>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                  Đến chi nhánh
                </span>
                <SearchableSelect value={toSiteId} onChange={setToSiteId}>
                  <option value="">Chọn chi nhánh</option>
                  {workSites.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </SearchableSelect>
              </label>
              <div />
            </div>

            <div style={{ marginBottom: "32px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                  Lý do / Ghi chú
                </span>
                <textarea
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid var(--qlvt-border, #e2e8f0)",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                  }}
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập lý do bàn giao..."
                />
              </label>
            </div>

            <h3
              style={{
                margin: "0 0 16px 0",
                fontSize: "16px",
                fontWeight: 600,
                borderBottom: "2px solid #e2e8f0",
                paddingBottom: "10px",
                color: "#0f172a",
              }}
            >
              Danh sách tài sản luân chuyển
            </h3>

            <div style={{ marginBottom: "16px", maxWidth: "500px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                  Tìm và chọn tài sản để thêm
                </span>
                <SearchableSelect
                  value={assetSelector}
                  onChange={(val) => {
                    if (val && !selectedAssetIds.includes(Number(val))) {
                      setSelectedAssetIds((prev) => [...prev, Number(val)]);
                    }
                    setAssetSelector("");
                  }}
                >
                  <option value="">-- Tìm kiếm tài sản --</option>
                  {assets.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.assetCode} - {a.name}
                    </option>
                  ))}
                </SearchableSelect>
              </label>
            </div>

            <div
              className="table-wrap"
              style={{
                border: "1px solid var(--qlvt-border, #e2e8f0)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f8fafc" }}>
                  <tr>
                    <th
                      style={{
                        padding: "12px 16px",
                        color: "#64748b",
                        fontSize: "13px",
                        fontWeight: 600,
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      Mã tài sản
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        color: "#64748b",
                        fontSize: "13px",
                        fontWeight: 600,
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      Tên tài sản
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        color: "#64748b",
                        fontSize: "13px",
                        fontWeight: 600,
                        width: "80px",
                        borderBottom: "1px solid #e2e8f0",
                        textAlign: "center",
                      }}
                    >
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAssetIds.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}
                      >
                        Chưa có tài sản nào được chọn
                      </td>
                    </tr>
                  ) : (
                    selectedAssetIds.map((id) => {
                      const asset = assets.find((a) => a.id === id);
                      return (
                        <tr key={id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: "#2563eb" }}>
                            {asset?.assetCode}
                          </td>
                          <td style={{ padding: "12px 16px" }}>{asset?.name}</td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedAssetIds((prev) => prev.filter((x) => x !== id))
                              }
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                color: "#ef4444",
                                fontWeight: 500,
                              }}
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                marginTop: "32px",
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="secondary"
                onClick={() => setView("list")}
                disabled={isSubmitting}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="primary-action"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || selectedAssetIds.length === 0}
              >
                Xác nhận {transferType.toLowerCase()}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
