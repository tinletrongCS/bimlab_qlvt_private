import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiEye, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { SearchableSelect } from "../components/forms/SearchableSelect";
import { OverflowActions } from "../components/OverflowActions";
import { useActions } from "../contexts/ActionsContext";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import { createTransfer, uploadTransferDocument } from "../services/api";
import type { AssetTransfer, EmployeeLite } from "../services/types";

function employeeName(employee?: EmployeeLite): string {
  return employee?.fullName || employee?.name || (employee ? `Nhân viên #${employee.id}` : "--");
}

interface TransferGroup {
  ticketId: string;
  transferDate: string;
  transferType: string;
  reason: string;
  status: string;
  assets: NonNullable<AssetTransfer["lines"]>;
  first: AssetTransfer;
}

function TransferListPagination({
  page,
  pageSize,
  total,
  itemLabel = "phiếu",
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  return (
    <div className="table-pagination asset-list-pagination">
      <div className="table-pagination-summary">
        Hiển thị{" "}
        <strong>
          {start}-{end}
        </strong>{" "}
        / <strong>{total}</strong> {itemLabel}
      </div>
      <div className="table-pagination-controls">
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          <option value="5">5 / trang</option>
          <option value="10">10 / trang</option>
          <option value="20">20 / trang</option>
          <option value="50">50 / trang</option>
          <option value="100">100 / trang</option>
        </select>
        <button type="button" disabled={safePage <= 1} onClick={() => onPageChange(1)}>
          &laquo;
        </button>
        <button type="button" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>
          &lsaquo;
        </button>
        <span>
          {safePage} / {pageCount}
        </span>
        <button
          type="button"
          disabled={safePage >= pageCount}
          onClick={() => onPageChange(safePage + 1)}
        >
          &rsaquo;
        </button>
        <button
          type="button"
          disabled={safePage >= pageCount}
          onClick={() => onPageChange(pageCount)}
        >
          &raquo;
        </button>
      </div>
    </div>
  );
}

export function TransfersPage() {
  const { hasPermission } = useAuth();
  const { transfers, employees, departments, workSites, assets, ensureTransfers, ensureAssets } =
    useAppData();
  const { deleteResource } = useActions();

  const [view, setView] = useState<"list" | "create" | "pending">("list");
  const [selectedTicket, setSelectedTicket] = useState<TransferGroup | null>(null);

  // Filters for list view
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(20);
  const [assetPage, setAssetPage] = useState(1);
  const [assetPageSize, setAssetPageSize] = useState(5);

  // Create form state
  const [transferType, setTransferType] = useState("Bàn giao");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [decisionDate, setDecisionDate] = useState(new Date().toISOString().split("T")[0]);
  const [toEmployeeId, setToEmployeeId] = useState("");
  const [toDepartmentId, setToDepartmentId] = useState("");
  const [toSiteId, setToSiteId] = useState("");
  const [reason, setReason] = useState("");

  const [requireApproval, setRequireApproval] = useState(false);
  const [approvedByUsers, setApprovedByUsers] = useState<string[]>([]);

  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [assetSelector, setAssetSelector] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void ensureTransfers();
    if (view === "create") {
      void ensureAssets(false, true);
    }
  }, [ensureTransfers, ensureAssets, view]);

  const canManage = hasPermission("asset_manage");
  const empLabel = (id?: number) => (id ? employeeName(employees.find((e) => e.id === id)) : "--");
  const selectedAsset =
    selectedAssetIds.length === 1
      ? assets.find((asset) => asset.id === selectedAssetIds[0])
      : undefined;
  const lockSite = selectedAsset?.siteId != null;
  const lockDepartment = selectedAsset?.departmentId != null;
  const lockEmployee = selectedAsset?.assignedEmployeeId != null;

  const availableDepartments = useMemo(() => {
    if (lockDepartment && selectedAsset?.departmentId)
      return departments.filter((department) => department.id === selectedAsset.departmentId);
    return toSiteId ? departments : [];
  }, [toSiteId, departments, lockDepartment, selectedAsset?.departmentId]);

  const availableEmployees = useMemo(() => {
    if (lockEmployee && selectedAsset?.assignedEmployeeId)
      return employees.filter((employee) => employee.id === selectedAsset.assignedEmployeeId);
    if (!toDepartmentId) return [];
    const dept = departments.find((d) => d.id === Number(toDepartmentId));
    if (!dept) return employees;
    return employees.filter((e) => e.departmentName === dept.name);
  }, [toDepartmentId, employees, departments, lockEmployee, selectedAsset?.assignedEmployeeId]);

  useEffect(() => {
    if (!selectedAsset) return;
    setToSiteId(selectedAsset.siteId ? String(selectedAsset.siteId) : "");
    setToDepartmentId(selectedAsset.departmentId ? String(selectedAsset.departmentId) : "");
    setToEmployeeId(
      selectedAsset.assignedEmployeeId ? String(selectedAsset.assignedEmployeeId) : "",
    );
  }, [selectedAsset]);

  useEffect(() => setAssetPage(1), [selectedAssetIds]);

  const resetForm = () => {
    setTransferType("Bàn giao");
    setTransferDate(new Date().toISOString().split("T")[0]);
    setDecisionDate(new Date().toISOString().split("T")[0]);
    setToEmployeeId("");
    setToDepartmentId("");
    setToSiteId("");
    setReason("");
    setRequireApproval(false);
    setApprovedByUsers([]);
    setSelectedAssetIds([]);
    setSelectedFiles([]);
  };

  const handleTabChange = (newView: "list" | "create" | "pending") => {
    setView(newView);
    setSelectedTicket(null);
    if (newView === "create") {
      resetForm();
      void ensureAssets(false, true);
    } else {
      void ensureTransfers();
      setListPage(1);
    }
  };

  const groupedTransfers = useMemo(() => {
    return transfers.map((first) => ({
      ticketId: first.transferCode || `PBG-${first.id.toString().padStart(4, "0")}`,
      transferDate: first.transferDate,
      transferType: first.transferType,
      reason: first.reason ?? "",
      status: first.approvedBy ? "Đã phê duyệt" : "Chờ duyệt",
      assets: first.lines ?? [],
      first,
    }));
  }, [transfers]);

  const filteredTransfers = useMemo(() => {
    return groupedTransfers.filter((t) => {
      if (view === "pending" && t.status !== "Chờ duyệt") return false;
      if (filterType && t.transferType !== filterType) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterDate && t.transferDate !== filterDate) return false;
      if (searchQuery && !t.ticketId.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;
      return true;
    });
  }, [groupedTransfers, filterType, filterStatus, filterDate, searchQuery, view]);

  // Pagination processing
  const pageCount = Math.max(1, Math.ceil(filteredTransfers.length / listPageSize));
  const safeListPage = Math.min(listPage, pageCount);
  const pagedTransfers = useMemo(() => {
    const startIndex = (safeListPage - 1) * listPageSize;
    return filteredTransfers.slice(startIndex, startIndex + listPageSize);
  }, [filteredTransfers, safeListPage, listPageSize]);
  const safeAssetPage = Math.min(
    assetPage,
    Math.max(1, Math.ceil(selectedAssetIds.length / assetPageSize)),
  );
  const pagedAssetIds = selectedAssetIds.slice(
    (safeAssetPage - 1) * assetPageSize,
    safeAssetPage * assetPageSize,
  );

  // Available assets for selection
  const availableAssets = useMemo(() => {
    const pendingAssetIds = new Set<number>();
    transfers.forEach((t) => {
      if (!t.approvedBy) t.lines?.forEach((line) => void pendingAssetIds.add(line.assetId));
    });
    return assets.filter((a) => !selectedAssetIds.includes(a.id) && !pendingAssetIds.has(a.id));
  }, [assets, selectedAssetIds, transfers]);

  const handleSubmit = async () => {
    if (selectedAssetIds.length === 0) return toast.error("Vui lòng chọn ít nhất 1 tài sản");
    setIsSubmitting(true);
    try {
      const documents = await Promise.all(
        selectedFiles.map(async (file) => {
          const uploaded = await uploadTransferDocument(file);
          return {
            fileName: file.name,
            objectKey: uploaded.fileKey,
            contentType: file.type,
            sizeBytes: file.size,
          };
        }),
      );
      await createTransfer({
        title: `${transferType} tài sản`,
        transferType,
        toEmployeeId: toEmployeeId ? Number(toEmployeeId) : undefined,
        toDepartmentId: toDepartmentId ? Number(toDepartmentId) : undefined,
        toSiteId: toSiteId ? Number(toSiteId) : undefined,
        transferDate,
        plannedHandoverAt: `${decisionDate}T09:00:00`,
        reason,
        approverEmployeeIds: requireApproval ? approvedByUsers.map(Number) : undefined,
        documents,
        lines: selectedAssetIds.map((assetId) => ({ assetId })),
      });
      toast.success("Tạo phiếu bàn giao thành công!");
      void ensureTransfers();

      resetForm();
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

  const removeApprover = (empIdStr: string) => {
    setApprovedByUsers((prev) => prev.filter((x) => x !== empIdStr));
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
            onClick={() => handleTabChange("list")}
          >
            Danh sách phiếu
          </button>
          <button
            type="button"
            className={view === "create" ? "active" : ""}
            onClick={() => handleTabChange("create")}
          >
            Tạo phiếu
          </button>
          <button
            type="button"
            className={view === "pending" ? "active" : ""}
            onClick={() => handleTabChange("pending")}
          >
            Phiếu chờ duyệt
          </button>
        </div>

        {view !== "create" && canManage && (
          <button
            type="button"
            className="primary-action btn-download-green"
            onClick={() => handleTabChange("create")}
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
                  {pagedTransfers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}
                      >
                        Không tìm thấy phiếu bàn giao nào phù hợp
                      </td>
                    </tr>
                  ) : (
                    pagedTransfers.map((ticket, index) => (
                      <tr key={ticket.ticketId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                          {(safeListPage - 1) * listPageSize + index + 1}
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

            <TransferListPagination
              page={safeListPage}
              pageSize={listPageSize}
              total={filteredTransfers.length}
              onPageChange={setListPage}
              onPageSizeChange={(sz) => {
                setListPageSize(sz);
                setListPage(1);
              }}
            />
          </div>
        </section>
      )}

      {/* Ticket Details Modal matching AssetDetailPanel styling */}
      {selectedTicket && (
        <div className="modal-backdrop">
          <div
            className="crud-modal asset-detail-modal"
            style={{ width: "900px", maxWidth: "90vw" }}
          >
            <div className="modal-head">
              <div className="modal-title-group">
                <span className="modal-title-icon edit">
                  <FiEye />
                </span>
                <h2>Chi tiết phiếu bàn giao</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setSelectedTicket(null)}>
                <FiX />
              </button>
            </div>

            <div className="asset-detail-body">
              <div className="asset-detail-hero">
                <div>
                  <span>Số quyết định</span>
                  <strong style={{ color: "#2563eb", fontWeight: 700, fontSize: "14px" }}>
                    {selectedTicket.ticketId}
                  </strong>
                </div>
                <div>
                  <span>Trạng thái</span>
                  <strong
                    style={{
                      color: selectedTicket.status === "Đã phê duyệt" ? "#166534" : "#92400e",
                      fontWeight: 700,
                      fontSize: "14px",
                    }}
                  >
                    {selectedTicket.status}
                  </strong>
                </div>
              </div>

              <div className="asset-detail-grid">
                <section className="asset-detail-section">
                  <h3>Thông tin chung</h3>
                  <div className="asset-detail-fields">
                    <label>
                      <span>Ngày quyết định</span>
                      <input value={selectedTicket.transferDate} disabled />
                    </label>
                    <label>
                      <span>Ngày thực hiện</span>
                      <input value={selectedTicket.transferDate} disabled />
                    </label>
                    <label>
                      <span>Phân loại</span>
                      <input value={selectedTicket.transferType} disabled />
                    </label>
                    <label className="asset-detail-wide-field">
                      <span>Lý do</span>
                      <textarea
                        value={selectedTicket.reason || "--"}
                        disabled
                        rows={3}
                        style={{ resize: "none" }}
                      />
                    </label>
                  </div>
                </section>

                <section className="asset-detail-section asset-detail-section-wide">
                  <h3>Danh sách tài sản luân chuyển</h3>
                  <div
                    className="table-wrap"
                    style={{
                      border: "1px solid var(--qlvt-border, #e2e8f0)",
                      borderRadius: "8px",
                      overflow: "hidden",
                      marginTop: "12px",
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
                            <tr
                              key={assetTransfer.id}
                              style={{ borderBottom: "1px solid #f1f5f9" }}
                            >
                              <td style={{ padding: "12px 16px", fontWeight: 500 }}>{idx + 1}</td>
                              <td style={{ padding: "12px 16px" }}>
                                <div
                                  style={{ fontWeight: 600, color: "#2563eb", marginBottom: "4px" }}
                                >
                                  {assetTransfer.assetCode}
                                </div>
                                <div style={{ fontSize: "13px", color: "#64748b" }}>
                                  {assetTransfer.assetName}
                                </div>
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                <div
                                  style={{
                                    fontSize: "13px",
                                    color: "#64748b",
                                    marginBottom: "4px",
                                  }}
                                >
                                  Từ:{" "}
                                  {assetTransfer.fromEmployeeId
                                    ? empLabel(assetTransfer.fromEmployeeId)
                                    : fullAsset
                                      ? getAssetLocation(fullAsset)
                                      : "Chưa xác định"}
                                </div>
                                <div style={{ fontSize: "13px", color: "#0f172a" }}>
                                  Đến:{" "}
                                  {assetTransfer.toEmployeeId
                                    ? empLabel(assetTransfer.toEmployeeId)
                                    : (assetTransfer as any).toSiteId
                                      ? "Chi nhánh/Phòng ban mới"
                                      : "Chưa phân công"}
                                </div>
                              </td>
                              <td style={{ padding: "12px 16px", color: "#64748b" }}>
                                {assetTransfer.receiverNote || "--"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="asset-detail-section asset-detail-section-wide">
                  <h3>Tệp đính kèm</h3>
                  <div
                    style={{
                      padding: "16px",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px dashed #cbd5e1",
                    }}
                  >
                    <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                      Không có tệp đính kèm nào được lưu (Backend cần hỗ trợ lưu file).
                    </span>
                  </div>
                </section>
              </div>
            </div>

            <div className="modal-actions asset-detail-actions">
              <button type="button" className="secondary" onClick={() => setSelectedTicket(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "create" && (
        <section className="panel transfer-create-form">
          <div
            className="panel-body"
            style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}
          >
            {/* Top Row: Thông tin chung & Xét duyệt */}
            <div
              style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}
            >
              {/* Thông tin chung */}
              <div style={{ flex: 2, minWidth: "400px" }}>
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
                      disabled={lockSite}
                      onChange={(value) => {
                        setToSiteId(value);
                        setToDepartmentId("");
                        setToEmployeeId("");
                      }}
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
                      disabled={!toSiteId || lockDepartment}
                      onChange={(value) => {
                        setToDepartmentId(value);
                        setToEmployeeId("");
                      }}
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
                      disabled={!toDepartmentId || lockEmployee}
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
              <div style={{ flex: 1, minWidth: "280px" }}>
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
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Chỉ định người xét duyệt */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      background: requireApproval ? "#f1f5f9" : "transparent",
                      padding: requireApproval ? "12px" : "0",
                      borderRadius: "8px",
                      transition: "all 0.2s",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        width: "fit-content",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={requireApproval}
                        onChange={(e) => {
                          setRequireApproval(e.target.checked);
                          if (!e.target.checked) setApprovedByUsers([]);
                        }}
                        style={{
                          width: "16px",
                          height: "16px",
                          cursor: "pointer",
                          accentColor: "#2563eb",
                        }}
                      />
                      <span style={{ fontSize: "14px", fontWeight: 500, color: "#334155" }}>
                        Chỉ định người xét duyệt
                      </span>
                    </label>

                    {requireApproval && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          marginTop: "4px",
                        }}
                      >
                        <div style={{ fontFamily: "inherit" }}>
                          <SearchableSelect
                            className="transfer-asset-select"
                            value=""
                            onChange={(val) => {
                              if (val && !approvedByUsers.includes(val)) {
                                setApprovedByUsers((prev) => [...prev, val]);
                              }
                            }}
                          >
                            <option value="">Thêm người duyệt...</option>
                            {employees.map((e) => (
                              <option key={e.id} value={String(e.id)}>
                                {employeeName(e)}
                              </option>
                            ))}
                          </SearchableSelect>
                        </div>

                        {/* Selected Reviewers List with internal scroll */}
                        {approvedByUsers.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                              maxHeight: "150px",
                              overflowY: "auto",
                              paddingRight: "4px",
                            }}
                          >
                            {approvedByUsers.map((empIdStr) => {
                              const emp = employees.find((e) => String(e.id) === empIdStr);
                              return (
                                <div
                                  key={empIdStr}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    background: "#fff",
                                    padding: "6px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #e2e8f0",
                                    fontSize: "13px",
                                  }}
                                >
                                  <span style={{ color: "#0f172a" }}>
                                    {emp ? employeeName(emp) : empIdStr}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeApprover(empIdStr)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "#ef4444",
                                      cursor: "pointer",
                                      textDecoration: "underline",
                                      padding: 0,
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
                    )}
                  </div>

                  {/* Tệp đính kèm */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      background: selectedFiles.length > 0 ? "#f1f5f9" : "transparent",
                      padding: selectedFiles.length > 0 ? "12px" : "0",
                      borderRadius: "8px",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 500, color: "#334155" }}>
                        Tài liệu đính kèm
                      </span>
                      <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#2563eb",
                          textDecoration: "underline",
                          fontSize: "13px",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Thêm tệp đính kèm
                      </button>
                    </div>

                    {/* File list preview with internal scroll */}
                    {selectedFiles.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          maxHeight: "150px",
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
                                background: "#fff",
                                padding: "6px 10px",
                                borderRadius: "6px",
                                border: "1px solid #e2e8f0",
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
                                  textDecoration: "underline",
                                  padding: 0,
                                  fontSize: "13px",
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
                  <div style={{ flex: 1, fontFamily: "inherit" }}>
                    <SearchableSelect
                      className="transfer-asset-select"
                      value={assetSelector}
                      placeholder="Chọn tài sản để thêm"
                      onChange={(val) => {
                        if (val && !selectedAssetIds.includes(Number(val))) {
                          setSelectedAssetIds((prev) => [...prev, Number(val)]);
                        }
                        setAssetSelector("");
                      }}
                    >
                      {availableAssets.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          {a.assetCode} {a.name}
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
                  overflowY: "auto",
                  maxHeight: "400px",
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
                      pagedAssetIds.map((id, index) => {
                        const asset = assets.find((a) => a.id === id);

                        const siteName = toSiteId
                          ? workSites.find((s) => s.id === Number(toSiteId))?.name
                          : "";
                        const deptName = toDepartmentId
                          ? departments.find((d) => d.id === Number(toDepartmentId))?.name
                          : "";
                        const eName = toEmployeeId ? empLabel(Number(toEmployeeId)) : "";
                        return (
                          <tr key={id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                              {(safeAssetPage - 1) * assetPageSize + index + 1}
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
                              <div style={{ display: "grid", gap: "3px", fontSize: "13px" }}>
                                <div>
                                  <span style={{ color: "#64748b" }}>Chi nhánh:</span>{" "}
                                  <strong>{siteName || "Chưa chọn"}</strong>
                                </div>
                                <div>
                                  <span style={{ color: "#64748b" }}>Phòng ban:</span>{" "}
                                  <strong>{deptName || "Chưa chọn"}</strong>
                                </div>
                                <div>
                                  <span style={{ color: "#64748b" }}>Nhân viên:</span>{" "}
                                  <strong>{eName || "Chưa chọn"}</strong>
                                </div>
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
              {selectedAssetIds.length > 0 && (
                <TransferListPagination
                  page={safeAssetPage}
                  pageSize={assetPageSize}
                  total={selectedAssetIds.length}
                  itemLabel="tài sản"
                  onPageChange={setAssetPage}
                  onPageSizeChange={(size) => {
                    setAssetPageSize(size);
                    setAssetPage(1);
                  }}
                />
              )}
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
