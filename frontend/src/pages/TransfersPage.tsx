import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiPlus,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { SearchableSelect } from "../components/forms/SearchableSelect";
import { OverflowActions } from "../components/OverflowActions";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import { createTransfer } from "../services/api";
import type { AssetTransfer, EmployeeLite } from "../services/types";

interface TransferGroup {
  ticketId: string;
  transferDate: string;
  transferType: string;
  reason: string;
  status: string;
  assets: NonNullable<AssetTransfer["lines"]>;
  first: AssetTransfer;
}

function employeeName(employee?: EmployeeLite): string {
  if (!employee) return "--";
  return employee.fullName || employee.name || `Nhân viên #${employee.id}`;
}

function CompactPagination({
  page,
  pageSize,
  total,
  itemLabel,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  if (total === 0) return null;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  return (
    <div className="table-pagination">
      <div className="table-pagination-summary">
        Hiển thị{" "}
        <strong>
          {start}-{end}
        </strong>{" "}
        / <strong>{total}</strong> {itemLabel}
      </div>
      <div className="table-pagination-controls">
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          aria-label="Số dòng mỗi trang"
        >
          {[5, 10, 20, 50].map((option) => (
            <option key={option} value={option}>
              {option}/trang
            </option>
          ))}
        </select>
        <button type="button" onClick={() => onPageChange(1)} disabled={safePage <= 1}>
          <FiChevronsLeft />
        </button>
        <button type="button" onClick={() => onPageChange(safePage - 1)} disabled={safePage <= 1}>
          <FiChevronLeft />
        </button>
        <span>
          {safePage} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= pageCount}
        >
          <FiChevronRight />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(pageCount)}
          disabled={safePage >= pageCount}
        >
          <FiChevronsRight />
        </button>
      </div>
    </div>
  );
}

export function TransfersPage() {
  const { hasPermission } = useAuth();
  const { transfers, employees, departments, workSites, assets, ensureTransfers, ensureAssets } =
    useAppData();

  const [view, setView] = useState<"list" | "create" | "pending">("list");
  const [selectedTicket, setSelectedTicket] = useState<TransferGroup | null>(null);

  // Filters for list view
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Create form state
  const [transferType, setTransferType] = useState("Bàn giao");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [decisionDate, setDecisionDate] = useState(new Date().toISOString().split("T")[0]);
  const [toEmployeeId, setToEmployeeId] = useState("");
  const [toDepartmentId, setToDepartmentId] = useState("");
  const [toSiteId, setToSiteId] = useState("");
  const [reason, setReason] = useState("");
  const [requireAssignedApprovers, setRequireAssignedApprovers] = useState(false);
  const [approverSelector, setApproverSelector] = useState("");
  const [approverEmployeeIds, setApproverEmployeeIds] = useState<number[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [assetSelector, setAssetSelector] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferPage, setTransferPage] = useState(1);
  const [transferPageSize, setTransferPageSize] = useState(10);
  const [selectedAssetPage, setSelectedAssetPage] = useState(1);
  const [selectedAssetPageSize, setSelectedAssetPageSize] = useState(5);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void ensureTransfers();
    if (view === "create") {
      void ensureAssets(false, true);
    }
  }, [ensureTransfers, ensureAssets, view]);

  const canManage = hasPermission(["asset_transfers_manage", "asset_manage"]);
  const canApprove = hasPermission(["asset_transfers_approve", "asset_manage"]);
  const empLabel = (id?: number) => (id ? employeeName(employees.find((e) => e.id === id)) : "--");
  const approverEmployeeIdSet = useMemo(() => new Set(approverEmployeeIds), [approverEmployeeIds]);
  const availableApprovers = useMemo(
    () => employees.filter((employee) => !approverEmployeeIdSet.has(employee.id)),
    [employees, approverEmployeeIdSet],
  );
  const statusLabel = (status?: string) => {
    if (status === "APPROVED") return "Đã phê duyệt";
    if (status === "REJECTED") return "Từ chối";
    if (status === "CANCELLED") return "Đã hủy";
    if (status === "PENDING_APPROVAL") return "Chờ duyệt";
    return status || "Chưa xác định";
  };

  const availableDepartments = departments;

  const availableEmployees = useMemo(() => {
    if (!toDepartmentId) return employees;
    const dept = departments.find((d) => d.id === Number(toDepartmentId));
    if (!dept) return employees;
    // Map employee by departmentName since frontend EmployeeLite doesn't have departmentId
    return employees.filter((e) => e.departmentName === dept.name);
  }, [toDepartmentId, employees, departments]);

  useEffect(() => {
    setToDepartmentId("");
    setToEmployeeId("");
  }, [toSiteId]);

  useEffect(() => {
    setToEmployeeId("");
  }, [toDepartmentId]);

  useEffect(() => {
    if (transferType !== "Thu hồi") return;
    setToSiteId("");
    setToDepartmentId("");
    setToEmployeeId("");
  }, [transferType]);

  const groupedTransfers = useMemo(() => {
    return transfers.map((first) => ({
      ticketId: first.transferCode || `PBG-${first.id.toString().padStart(4, "0")}`,
      transferDate: first.transferDate,
      transferType: first.transferType,
      reason: first.reason ?? "",
      status: statusLabel(first.status),
      assets: first.lines ?? [],
      first,
    }));
  }, [transfers]);

  const filteredTransfers = useMemo(() => {
    return groupedTransfers.filter((t) => {
      if (view === "pending" && t.first.status !== "PENDING_APPROVAL") return false;
      if (filterType && t.transferType !== filterType) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterDate && t.transferDate !== filterDate) return false;
      if (searchQuery && !t.ticketId.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;
      return true;
    });
  }, [groupedTransfers, filterType, filterStatus, filterDate, searchQuery, view]);

  useEffect(() => {
    setTransferPage(1);
  }, [filterType, filterStatus, filterDate, searchQuery, view]);

  useEffect(() => {
    setSelectedAssetPage(1);
  }, [selectedAssetIds]);

  const safeTransferPage = Math.min(
    transferPage,
    Math.max(1, Math.ceil(filteredTransfers.length / transferPageSize)),
  );
  const visibleTransfers = filteredTransfers.slice(
    (safeTransferPage - 1) * transferPageSize,
    safeTransferPage * transferPageSize,
  );

  const safeSelectedAssetPage = Math.min(
    selectedAssetPage,
    Math.max(1, Math.ceil(selectedAssetIds.length / selectedAssetPageSize)),
  );
  const visibleSelectedAssetIds = selectedAssetIds.slice(
    (safeSelectedAssetPage - 1) * selectedAssetPageSize,
    safeSelectedAssetPage * selectedAssetPageSize,
  );

  const selectedAssetIdSet = useMemo(() => new Set(selectedAssetIds), [selectedAssetIds]);

  // Available assets for selection
  const availableAssets = useMemo(() => {
    const pendingAssetIds = new Set<number>();
    transfers.forEach((transfer) => {
      if (transfer.status === "PENDING_APPROVAL") {
        transfer.lines?.forEach((line) => {
          pendingAssetIds.add(line.assetId);
        });
      }
    });
    return assets.filter((a) => !selectedAssetIdSet.has(a.id) && !pendingAssetIds.has(a.id));
  }, [assets, selectedAssetIdSet, transfers]);

  const availableAssetIdSet = useMemo(
    () => new Set(availableAssets.map((asset) => asset.id)),
    [availableAssets],
  );

  const handleSubmit = async () => {
    if (selectedAssetIds.length === 0) return toast.error("Vui lòng chọn ít nhất 1 tài sản");
    if (requireAssignedApprovers && approverEmployeeIds.length === 0) {
      return toast.error("Vui lòng chọn người xét duyệt");
    }
    setIsSubmitting(true);
    try {
      await createTransfer({
        title: `${transferType} tài sản`,
        transferType,
        toEmployeeId: toEmployeeId ? Number(toEmployeeId) : undefined,
        toDepartmentId: toDepartmentId ? Number(toDepartmentId) : undefined,
        toSiteId: toSiteId ? Number(toSiteId) : undefined,
        transferDate,
        plannedHandoverAt: `${decisionDate}T09:00:00`,
        reason,
        approverEmployeeIds: requireAssignedApprovers ? approverEmployeeIds : undefined,
        lines: selectedAssetIds.map((assetId) => ({ assetId })),
      });
      toast.success("Tạo phiếu bàn giao thành công!");
      void ensureTransfers();

      // Reset form
      setSelectedAssetIds([]);
      setReason("");
      setToEmployeeId("");
      setToDepartmentId("");
      setToSiteId("");
      setSelectedFiles([]);
      setRequireAssignedApprovers(false);
      setApproverSelector("");
      setApproverEmployeeIds([]);
    } catch (err) {
      console.error(err);
      toast.error("Có lỗi xảy ra khi gửi phiếu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formLabelStyle = {
    fontSize: "14px",
    fontWeight: 500,
    color: "#334155",
    display: "flex",
    gap: "4px",
  };
  const formInputStyle = {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid var(--qlvt-border, #e2e8f0)",
    fontSize: "14px",
    outline: "none",
    width: "100%",
    minHeight: "38px",
    background: "#fff",
    fontFamily: "inherit",
  };

  const getAssetLocation = (asset: any) => {
    const parts = [];
    if (asset.siteId) {
      const site = workSites.find((s) => s.id === asset.siteId);
      if (site) parts.push(site.name);
    }
    if (asset.departmentId) {
      const dept = departments.find((d) => d.id === asset.departmentId);
      if (dept) parts.push(dept.name);
    }
    if (asset.assignedEmployeeId) {
      const emp = employees.find((e) => e.id === asset.assignedEmployeeId);
      if (emp) parts.push(employeeName(emp));
    }
    return parts.length > 0 ? parts.join(" - ") : "Chưa xác định";
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case "IN_STOCK":
        return "Trong kho";
      case "ASSIGNED":
        return "Đang sử dụng";
      case "MAINTENANCE":
        return "Đang bảo trì";
      case "DISPOSED":
        return "Đã thanh lý";
      default:
        return status || "--";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const addedFiles: File[] = [];
      newFiles.forEach((nf) => {
        const isDuplicate = selectedFiles.some((sf) => sf.name === nf.name && sf.size === nf.size);
        if (isDuplicate) {
          toast.error(`Tệp "${nf.name}" đã được đính kèm!`);
        } else {
          addedFiles.push(nf);
        }
      });
      setSelectedFiles((prev) => [...prev, ...addedFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* Header and Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div
          className="category-view-tabs"
          style={{ display: "inline-flex", gap: "8px", margin: 0 }}
        >
          <button
            type="button"
            className={view === "list" ? "active" : ""}
            onClick={() => {
              setView("list");
              setSelectedTicket(null);
            }}
          >
            Danh sách phiếu
          </button>
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
          {canApprove && (
            <button
              type="button"
              className={view === "pending" ? "active" : ""}
              onClick={() => {
                setView("pending");
                setSelectedTicket(null);
              }}
            >
              Phiếu chờ duyệt
            </button>
          )}
        </div>

        {view !== "create" && canManage && (
          <button
            type="button"
            className="primary-action"
            onClick={() => setView("create")}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <FiPlus /> Thêm mới
          </button>
        )}
      </div>

      {(view === "list" || view === "pending") && (
        <section className="panel">
          <div className="panel-body" style={{ padding: "24px" }}>
            {/* Filters */}
            <div
              className="category-filters"
              style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}
            >
              <div
                className="category-filter"
                style={{ flex: 1, minWidth: "160px", maxWidth: "200px" }}
              >
                <SearchableSelect value={filterType} onChange={setFilterType}>
                  <option value="">Tất cả phân loại</option>
                  <option value="Bàn giao">Bàn giao</option>
                  <option value="Thu hồi">Thu hồi</option>
                  <option value="Điều chuyển">Điều chuyển</option>
                  <option value="Cấp phát">Cấp phát</option>
                </SearchableSelect>
              </div>
              <div
                className="category-filter"
                style={{ flex: 1, minWidth: "160px", maxWidth: "200px" }}
              >
                <SearchableSelect value={filterStatus} onChange={setFilterStatus}>
                  <option value="">Tất cả trạng thái</option>
                  <option value="Đã phê duyệt">Đã phê duyệt</option>
                  <option value="Chờ duyệt">Chờ duyệt</option>
                </SearchableSelect>
              </div>
              <div
                className="category-filter"
                style={{ flex: 1, minWidth: "160px", maxWidth: "200px" }}
              >
                <input
                  type="date"
                  title="Ngày thực hiện"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  style={{ ...formInputStyle }}
                />
              </div>
              <div className="category-filter" style={{ flex: 2, minWidth: "250px" }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm theo Số quyết định (VD: PBG-0001)..."
                  style={{ ...formInputStyle }}
                />
              </div>
            </div>

            {/* List Table */}
            <div
              className="table-wrap"
              style={{
                border: "1px solid var(--qlvt-border, #e2e8f0)",
                borderRadius: "8px",
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
                        textAlign: "center",
                      }}
                    >
                      Thao tác
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
                    visibleTransfers.map((ticket, index) => (
                      <tr key={ticket.ticketId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                          {(safeTransferPage - 1) * transferPageSize + index + 1}
                        </td>
                        <td style={{ padding: "12px 16px" }}>{ticket.transferDate}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#2563eb" }}>
                          {ticket.ticketId}
                        </td>
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
                              background: ticket.status === "Đã phê duyệt" ? "#dcfce7" : "#fef3c7",
                              color: ticket.status === "Đã phê duyệt" ? "#166534" : "#92400e",
                            }}
                          >
                            {ticket.status}
                          </span>
                        </td>
                        <td
                          style={{ padding: "12px 16px", textAlign: "center" }}
                          className="asset-table-actions-col asset-table-sticky-right"
                        >
                          <OverflowActions
                            label={`Mở thao tác cho ${ticket.ticketId}`}
                            actions={[
                              {
                                label: "Xem chi tiết",
                                onClick: () => setSelectedTicket(ticket),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <CompactPagination
              page={safeTransferPage}
              pageSize={transferPageSize}
              total={filteredTransfers.length}
              itemLabel="phiếu"
              onPageChange={setTransferPage}
              onPageSizeChange={(nextPageSize) => {
                setTransferPageSize(nextPageSize);
                setTransferPage(1);
              }}
            />
          </div>
        </section>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "900px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#0f172a" }}>
                Chi tiết phiếu: <span style={{ color: "#2563eb" }}>{selectedTicket.ticketId}</span>
              </h2>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px",
                }}
              >
                <FiX size={24} />
              </button>
            </div>

            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "24px",
                  background: "#f8fafc",
                  padding: "16px",
                  borderRadius: "8px",
                }}
              >
                <div>
                  <span style={{ color: "#64748b", fontSize: "13px" }}>Ngày quyết định:</span>{" "}
                  <strong style={{ color: "#0f172a" }}>{selectedTicket.transferDate}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "13px" }}>Phân loại:</span>{" "}
                  <strong style={{ color: "#0f172a" }}>{selectedTicket.transferType}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "13px" }}>Ngày thực hiện:</span>{" "}
                  <strong style={{ color: "#0f172a" }}>{selectedTicket.transferDate}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "13px" }}>Trạng thái:</span>{" "}
                  <strong style={{ color: "#0f172a" }}>{selectedTicket.status}</strong>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ color: "#64748b", fontSize: "13px" }}>Lý do:</span>{" "}
                  <strong style={{ color: "#0f172a" }}>{selectedTicket.reason || "--"}</strong>
                </div>
              </div>

              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  marginBottom: "12px",
                  color: "#0f172a",
                }}
              >
                Danh sách tài sản luân chuyển
              </h3>
              <div
                className="table-wrap"
                style={{
                  border: "1px solid var(--qlvt-border, #e2e8f0)",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                    <tr>
                      <th
                        style={{
                          padding: "10px 16px",
                          color: "#475569",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        STT
                      </th>
                      <th
                        style={{
                          padding: "10px 16px",
                          color: "#475569",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        Tài sản
                      </th>
                      <th
                        style={{
                          padding: "10px 16px",
                          color: "#475569",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        Thông tin luân chuyển
                      </th>
                      <th
                        style={{
                          padding: "10px 16px",
                          color: "#475569",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        Ghi chú
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTicket.assets.map((assetTransfer, idx) => {
                      const fullAsset = assets.find((a) => a.id === assetTransfer.assetId);
                      return (
                        <tr key={assetTransfer.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 16px", fontWeight: 500 }}>{idx + 1}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 600, color: "#2563eb", marginBottom: "4px" }}>
                              {assetTransfer.assetCode || fullAsset?.assetCode || "--"}
                            </div>
                            <div style={{ fontSize: "13px", color: "#64748b" }}>
                              {assetTransfer.assetName || fullAsset?.name || "--"}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div
                              style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}
                            >
                              Từ:{" "}
                              {selectedTicket.first.fromEmployeeId
                                ? empLabel(selectedTicket.first.fromEmployeeId)
                                : fullAsset
                                  ? getAssetLocation(fullAsset)
                                  : "Chưa xác định"}
                            </div>
                            <div style={{ fontSize: "13px", color: "#0f172a" }}>
                              Đến:{" "}
                              {selectedTicket.first.toEmployeeId
                                ? empLabel(selectedTicket.first.toEmployeeId)
                                : "Chưa phân công"}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", color: "#64748b" }}>
                            {assetTransfer.receiverNote || selectedTicket.reason || "--"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end",
                background: "#f8fafc",
              }}
            >
              <button type="button" className="secondary" onClick={() => setSelectedTicket(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "create" && (
        <section className="panel">
          <div
            className="panel-body transfer-create-form"
            style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}
          >
            {/* Top Row: Thông tin chung & Xét duyệt */}
            <div style={{ display: "flex", gap: "24px", alignItems: "stretch", flexWrap: "wrap" }}>
              {/* Thông tin chung */}
              <div style={{ flex: 2, minWidth: "400px", display: "flex", flexDirection: "column" }}>
                <h3
                  style={{
                    margin: "0 0 16px",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#0f172a",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: "12px",
                  }}
                >
                  Thông tin chung
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={formLabelStyle}>
                      Ngày quyết định <span style={{ color: "red" }}>*</span>
                    </span>
                    <input
                      type="date"
                      value={decisionDate}
                      onChange={(e) => setDecisionDate(e.target.value)}
                      style={formInputStyle}
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={formLabelStyle}>
                      Ngày thực hiện <span style={{ color: "red" }}>*</span>
                    </span>
                    <input
                      type="date"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      style={formInputStyle}
                    />
                  </label>

                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      gridColumn: "span 2",
                    }}
                  >
                    <span style={formLabelStyle}>
                      Lý do <span style={{ color: "red" }}>*</span>
                    </span>
                    <textarea
                      rows={4}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      style={{ ...formInputStyle, resize: "vertical", minHeight: "80px" }}
                      placeholder="Nhập lý do..."
                    />
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={formLabelStyle}>
                      Phân loại <span style={{ color: "red" }}>*</span>
                    </span>
                    <SearchableSelect value={transferType} onChange={setTransferType}>
                      <option value="Bàn giao">Bàn giao</option>
                      <option value="Thu hồi">Thu hồi</option>
                    </SearchableSelect>
                  </label>
                  <div />

                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={formLabelStyle}>Chi nhánh</span>
                    <SearchableSelect
                      value={toSiteId}
                      onChange={setToSiteId}
                      disabled={transferType === "Thu hồi"}
                    >
                      <option value="">Chọn chi nhánh</option>
                      {workSites.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.name}
                        </option>
                      ))}
                    </SearchableSelect>
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={formLabelStyle}>Phòng ban nhận</span>
                    <SearchableSelect
                      value={toDepartmentId}
                      onChange={setToDepartmentId}
                      disabled={transferType === "Thu hồi" || availableDepartments.length === 0}
                    >
                      <option value="">Chọn phòng ban</option>
                      {availableDepartments.map((d) => (
                        <option key={d.id} value={String(d.id)}>
                          {d.name}
                        </option>
                      ))}
                    </SearchableSelect>
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={formLabelStyle}>Nhân viên nhận</span>
                    <SearchableSelect
                      value={toEmployeeId}
                      onChange={setToEmployeeId}
                      disabled={transferType === "Thu hồi" || availableEmployees.length === 0}
                    >
                      <option value="">Chọn nhân viên</option>
                      {availableEmployees.map((e) => (
                        <option key={e.id} value={String(e.id)}>
                          {employeeName(e)}
                        </option>
                      ))}
                    </SearchableSelect>
                  </label>
                </div>
              </div>

              {/* Xét duyệt & Tệp đính kèm */}
              <div style={{ flex: 1, minWidth: "280px", display: "flex", flexDirection: "column" }}>
                <h3
                  style={{
                    margin: "0 0 16px",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#0f172a",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: "12px",
                  }}
                >
                  Xét duyệt & Tệp đính kèm
                </h3>
                <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: "20px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={formLabelStyle}>Trạng thái xét duyệt</span>
                    <input
                      style={{ ...formInputStyle, background: "#f8fafc", color: "#64748b" }}
                      disabled
                      value="Chờ trình duyệt"
                    />
                  </label>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "13px",
                        color: "#334155",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={requireAssignedApprovers}
                        onChange={(event) => {
                          setRequireAssignedApprovers(event.target.checked);
                          if (!event.target.checked) {
                            setApproverSelector("");
                            setApproverEmployeeIds([]);
                          }
                        }}
                      />
                      Chỉ định người xét duyệt
                    </label>
                    <span style={formLabelStyle}>Người xét duyệt</span>
                    <SearchableSelect
                      value={approverSelector}
                      disabled={!requireAssignedApprovers}
                      onChange={(value) => {
                        const employeeId = Number(value);
                        if (value && !approverEmployeeIdSet.has(employeeId)) {
                          setApproverEmployeeIds((prev) => [...prev, employeeId]);
                        }
                        setApproverSelector("");
                      }}
                    >
                      <option value="">Chọn người xét duyệt</option>
                      {availableApprovers.map((e) => (
                        <option key={e.id} value={String(e.id)}>
                          {employeeName(e)}
                        </option>
                      ))}
                    </SearchableSelect>
                    {approverEmployeeIds.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                          maxHeight: "84px",
                          overflowY: "auto",
                        }}
                      >
                        {approverEmployeeIds.map((employeeId) => (
                          <div
                            key={employeeId}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "8px",
                              fontSize: "13px",
                              color: "#334155",
                            }}
                          >
                            <span>{empLabel(employeeId)}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setApproverEmployeeIds((prev) =>
                                  prev.filter((id) => id !== employeeId),
                                )
                              }
                              style={{
                                background: "none",
                                border: "none",
                                color: "#ef4444",
                                cursor: "pointer",
                                padding: 0,
                                textDecoration: "underline",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              Xóa
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      marginTop: "4px",
                      minHeight: 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={formLabelStyle}>Tài liệu đính kèm</span>
                      <button
                        type="button"
                        className="transfer-attachment-link"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Thêm tệp đính kèm
                      </button>
                    </div>
                    <input
                      type="file"
                      multiple
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />

                    {/* File list preview */}
                    {selectedFiles.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          marginTop: "4px",
                          maxHeight: "122px",
                          overflowY: "auto",
                          paddingRight: "4px",
                        }}
                      >
                        {selectedFiles.map((file, i) => {
                          const fileUrl = URL.createObjectURL(file);
                          return (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "10px",
                                padding: "2px 0",
                              }}
                            >
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: "#2563eb",
                                  textDecoration: "underline",
                                  fontSize: "13px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={file.name}
                              >
                                {file.name}
                              </a>
                              <button
                                type="button"
                                onClick={() => removeFile(i)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#ef4444",
                                  cursor: "pointer",
                                  padding: "2px",
                                  textDecoration: "underline",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                }}
                              >
                                Xóa
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Danh sách tài sản */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  borderBottom: "1px solid #e2e8f0",
                  paddingBottom: "12px",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#0f172a" }}>
                  Danh sách tài sản bàn giao/thu hồi
                </h3>
                <div style={{ width: "320px", display: "flex", gap: "8px" }}>
                  <div style={{ flex: 1 }}>
                    <SearchableSelect
                      className="transfer-asset-select"
                      value={assetSelector}
                      onChange={(val) => {
                        const assetId = Number(val);
                        if (val && availableAssetIdSet.has(assetId)) {
                          setSelectedAssetIds((prev) => [...prev, assetId]);
                        }
                        setAssetSelector("");
                      }}
                    >
                      <option value="">Chọn tài sản để thêm</option>
                      {availableAssets.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {a.assetCode} - {a.name}
                        </option>
                      ))}
                    </SearchableSelect>
                  </div>
                </div>
              </div>

              <div
                className="table-wrap"
                style={{
                  border: "1px solid var(--qlvt-border, #e2e8f0)",
                  borderRadius: "8px",
                  height: "360px",
                  overflow: "auto",
                }}
              >
                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 }}>
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
                        STT
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
                        Tài sản
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
                        Hiện trạng (Vị trí/TT)
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
                        Thông tin điều chuyển
                      </th>
                      <th
                        style={{
                          padding: "12px 16px",
                          color: "#64748b",
                          fontSize: "13px",
                          fontWeight: 600,
                          borderBottom: "1px solid #e2e8f0",
                          width: "180px",
                        }}
                      >
                        Ghi chú
                      </th>
                      <th
                        style={{
                          padding: "12px 16px",
                          color: "#64748b",
                          fontSize: "13px",
                          fontWeight: 600,
                          borderBottom: "1px solid #e2e8f0",
                          textAlign: "center",
                        }}
                      >
                        Xóa
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAssetIds.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}
                        >
                          Chưa có dữ liệu
                        </td>
                      </tr>
                    ) : (
                      visibleSelectedAssetIds.map((id, index) => {
                        const asset = assets.find((a) => a.id === id);
                        return (
                          <tr key={id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                              {(safeSelectedAssetPage - 1) * selectedAssetPageSize + index + 1}
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <div
                                style={{ fontWeight: 600, color: "#2563eb", marginBottom: "4px" }}
                              >
                                {asset?.assetCode}
                              </div>
                              <div style={{ fontSize: "13px", color: "#64748b" }}>
                                {asset?.name}
                              </div>
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <div
                                style={{ fontSize: "13px", color: "#0f172a", marginBottom: "4px" }}
                              >
                                {asset ? getAssetLocation(asset) : "--"}
                              </div>
                              <div style={{ fontSize: "13px", color: "#64748b" }}>
                                Trạng thái:{" "}
                                <strong>{asset ? translateStatus(asset.status) : "--"}</strong>
                              </div>
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <div
                                style={{ fontSize: "13px", color: "#0f172a", marginBottom: "4px" }}
                              >
                                {toSiteId
                                  ? workSites.find((s) => s.id === Number(toSiteId))?.name
                                  : ""}
                                {toDepartmentId
                                  ? ` - ${departments.find((d) => d.id === Number(toDepartmentId))?.name}`
                                  : ""}
                                {toEmployeeId ? ` - ${empLabel(Number(toEmployeeId))}` : ""}
                                {!toSiteId &&
                                  !toDepartmentId &&
                                  !toEmployeeId &&
                                  "Chưa chọn vị trí nhận"}
                              </div>
                              <div style={{ fontSize: "13px", color: "#2563eb" }}>
                                Trạng thái dự kiến:{" "}
                                <strong>
                                  {transferType === "Bàn giao" ? "Đang sử dụng" : "Trong kho"}
                                </strong>
                              </div>
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <input
                                type="text"
                                placeholder="Ghi chú..."
                                style={{
                                  ...formInputStyle,
                                  padding: "6px 10px",
                                  minHeight: "32px",
                                  fontSize: "13px",
                                }}
                              />
                            </td>
                            <td style={{ padding: "12px 16px", textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedAssetIds((prev) => prev.filter((x) => x !== id))
                                }
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: "6px",
                                  cursor: "pointer",
                                  color: "#ef4444",
                                  borderRadius: "6px",
                                }}
                                title="Xóa"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <CompactPagination
                page={safeSelectedAssetPage}
                pageSize={selectedAssetPageSize}
                total={selectedAssetIds.length}
                itemLabel="tài sản"
                onPageChange={setSelectedAssetPage}
                onPageSizeChange={(nextPageSize) => {
                  setSelectedAssetPageSize(nextPageSize);
                  setSelectedAssetPage(1);
                }}
              />
            </div>

            {/* Footer Actions Inline with Panel */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                borderTop: "1px solid #e2e8f0",
                paddingTop: "20px",
                marginTop: "8px",
              }}
            >
              <button
                type="button"
                className="asset-add-button btn-download-green"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || selectedAssetIds.length === 0}
                style={{ padding: "10px 24px" }}
              >
                Gửi
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
