import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiEye, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { SearchableSelect } from "../components/forms/SearchableSelect";
import { OverflowActions } from "../components/OverflowActions";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import { readError } from "../lib/format";
import {
  approveTransfer,
  cancelTransfer,
  createTransfer,
  downloadTransferDocument,
  rejectTransfer,
  uploadTransferDocument,
} from "../services/api";
import type { AssetTransfer, EmployeeLite } from "../services/types";

const DEFAULT_SITE_VALUE = "BIMLAB";

function employeeName(employee?: EmployeeLite): string {
  return employee?.fullName || employee?.name || (employee ? `Nhân viên #${employee.id}` : "--");
}

function approverName(employee?: EmployeeLite): string {
  const role = employee?.positionName || employee?.departmentName;
  return role ? `${employeeName(employee)} · ${role}` : employeeName(employee);
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

function transferStatusLabel(status?: string): string {
  if (status === "APPROVED") return "Đã phê duyệt";
  if (status === "REJECTED") return "Đã từ chối";
  if (status === "CANCELLED") return "Đã hủy";
  if (status === "PENDING_APPROVAL") return "Chờ duyệt";
  return status || "Chưa xác định";
}

function transferStatusBadgeClass(status?: string): string {
  return `badge transfer-status-badge badge-${(status || "pending").toLowerCase()}`;
}

function confirmationStatusLabel(status?: string): string {
  if (status === "APPROVED") return "Đã duyệt";
  if (status === "REJECTED") return "Đã từ chối";
  if (status === "CANCELLED") return "Đã hủy";
  if (status === "SKIPPED") return "Đã bỏ qua";
  return "Chờ duyệt";
}

function highlightTransferText(value: string, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return value;
  const index = value.toLowerCase().indexOf(normalizedQuery);
  if (index < 0) return value;
  return (
    <>
      {value.slice(0, index)}
      <mark className="search-match">{value.slice(index, index + normalizedQuery.length)}</mark>
      {value.slice(index + normalizedQuery.length)}
    </>
  );
}

function formatTransferDate(value?: string): string {
  return value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "--";
}

function formatTransferDateTime(value?: string): string {
  return value
    ? new Date(value).toLocaleString("vi-VN", {
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--";
}

function localDateValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function minimumTransferDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return localDateValue(tomorrow);
}

function transferTypeLabel(type?: string): string {
  if (type === "ASSIGN") return "Bàn giao";
  if (type === "REVOKE") return "Thu hồi";
  return type || "--";
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
  const { user, hasPermission } = useAuth();
  const {
    transfers,
    employees,
    departments,
    workSites,
    assets,
    ensureTransfers,
    ensureAssets,
    refresh,
  } = useAppData();

  const [view, setView] = useState<"list" | "create">("list");
  const [selectedTicket, setSelectedTicket] = useState<TransferGroup | null>(null);

  // Filters for list view
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingType, setPendingType] = useState("");
  const [pendingDate, setPendingDate] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(5);
  const [decisionReasons, setDecisionReasons] = useState<Record<number, string>>({});
  const [processingTransferId, setProcessingTransferId] = useState<number | null>(null);

  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(20);
  const [assetPage, setAssetPage] = useState(1);
  const [assetPageSize, setAssetPageSize] = useState(5);

  // Create form state
  const [transferType, setTransferType] = useState("Bàn giao");
  const [transferDate, setTransferDate] = useState(minimumTransferDate);
  const [toEmployeeId, setToEmployeeId] = useState("");
  const [toDepartmentId, setToDepartmentId] = useState("");
  const [toSiteId, setToSiteId] = useState(DEFAULT_SITE_VALUE);
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

  const canManage = hasPermission(["asset_transfers_manage", "asset_manage"]);
  const canApprove = hasPermission(["asset_transfers_approve", "asset_manage"]);
  const empLabel = (id?: number) => (id ? employeeName(employees.find((e) => e.id === id)) : "--");
  const isRevoke = transferType === "Thu hồi";

  const availableDepartments = useMemo(() => {
    return toSiteId ? departments : [];
  }, [toSiteId, departments]);

  const availableEmployees = useMemo(() => {
    if (!toDepartmentId) return [];
    const dept = departments.find((d) => d.id === Number(toDepartmentId));
    if (!dept) return employees;
    return employees.filter(
      (employee) =>
        employee.departmentId === dept.id ||
        (employee.departmentId == null && employee.departmentName === dept.name),
    );
  }, [toDepartmentId, employees, departments]);

  useEffect(() => {
    if (isRevoke) {
      setToSiteId("");
      setToDepartmentId("");
      setToEmployeeId("");
      return;
    }
    setToSiteId((current) => current || DEFAULT_SITE_VALUE);
  }, [isRevoke]);

  useEffect(() => setAssetPage(1), [selectedAssetIds]);

  const resetForm = () => {
    setTransferType("Bàn giao");
    setTransferDate(minimumTransferDate());
    setToEmployeeId("");
    setToDepartmentId("");
    setToSiteId(DEFAULT_SITE_VALUE);
    setReason("");
    setRequireApproval(false);
    setApprovedByUsers([]);
    setSelectedAssetIds([]);
    setSelectedFiles([]);
  };

  const handleTabChange = (newView: "list" | "create") => {
    setView(newView);
    setSelectedTicket(null);
    if (newView === "create") {
      resetForm();
      void ensureAssets(false, true);
    } else {
      void refresh();
      setListPage(1);
    }
  };

  const groupedTransfers = useMemo(() => {
    return transfers.map((first) => ({
      ticketId: first.transferCode || `PBG-${first.id.toString().padStart(4, "0")}`,
      transferDate: first.transferDate,
      transferType: transferTypeLabel(first.transferType),
      reason: first.reason ?? "",
      status: transferStatusLabel(first.status),
      assets: first.lines ?? [],
      first,
    }));
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

  const pendingTransfers = useMemo(
    () =>
      groupedTransfers.filter((ticket) => {
        if (ticket.first.status !== "PENDING_APPROVAL") return false;
        const assignedToMe = ticket.first.confirmations?.some(
          (confirmation) => confirmation.confirmerEmployeeId === user?.id,
        );
        if (!canApprove && !assignedToMe) return false;
        if (pendingType && ticket.transferType !== pendingType) return false;
        if (pendingDate && ticket.transferDate !== pendingDate) return false;
        if (
          pendingSearch &&
          !`${ticket.ticketId} ${ticket.first.title || ""} ${ticket.reason}`
            .toLowerCase()
            .includes(pendingSearch.toLowerCase())
        )
          return false;
        return true;
      }),
    [groupedTransfers, user?.id, canApprove, pendingType, pendingDate, pendingSearch],
  );

  const hasAssignedPending = groupedTransfers.some(
    (ticket) =>
      ticket.first.status === "PENDING_APPROVAL" &&
      ticket.first.confirmations?.some(
        (confirmation) => confirmation.confirmerEmployeeId === user?.id,
      ),
  );
  const safePendingPage = Math.min(
    pendingPage,
    Math.max(1, Math.ceil(pendingTransfers.length / pendingPageSize)),
  );
  const pagedPendingTransfers = pendingTransfers.slice(
    (safePendingPage - 1) * pendingPageSize,
    safePendingPage * pendingPageSize,
  );

  useEffect(() => setPendingPage(1), [pendingType, pendingDate, pendingSearch]);

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
      if (t.status === "PENDING_APPROVAL")
        t.lines?.forEach((line) => void pendingAssetIds.add(line.assetId));
    });
    return assets.filter((asset) => !pendingAssetIds.has(asset.id));
  }, [assets, transfers]);

  const handleSubmit = async () => {
    if (selectedAssetIds.length === 0) return toast.error("Vui lòng chọn ít nhất 1 tài sản");
    if (!transferDate || transferDate <= localDateValue(new Date()))
      return toast.error("Ngày thực hiện phải sau ngày tạo phiếu");
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
        toSiteId: toSiteId && toSiteId !== DEFAULT_SITE_VALUE ? Number(toSiteId) : undefined,
        transferDate,
        reason,
        approverEmployeeIds: requireApproval ? approvedByUsers.map(Number) : undefined,
        documents,
        lines: selectedAssetIds.map((assetId) => ({ assetId })),
      });
      toast.success("Tạo phiếu bàn giao thành công!");
      await refresh();

      resetForm();
    } catch (err) {
      console.error(err);
      toast.error(readError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formLabelStyle = {
    fontSize: "12px",
    fontWeight: 500,
    color: "#334155",
    display: "flex",
    gap: "4px",
    fontFamily: "Inter, Arial, sans-serif",
  };
  const formInputStyle = {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid var(--qlvt-border, #e2e8f0)",
    fontSize: "12px",
    outline: "none",
    width: "100%",
    minHeight: "38px",
    background: "#fff",
    fontFamily: "Inter, Arial, sans-serif",
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

  const canCancelTicket = (ticket: TransferGroup) =>
    ticket.first.status === "PENDING_APPROVAL" &&
    (canManage || ticket.first.requestedEmployeeId === user?.id);

  const handleDecision = async (ticket: TransferGroup, action: "approve" | "reject" | "cancel") => {
    const reason = decisionReasons[ticket.first.id]?.trim() || "";
    if (action !== "approve" && !reason) {
      toast.error(action === "reject" ? "Vui lòng nhập lý do từ chối" : "Vui lòng nhập lý do hủy");
      return;
    }
    if (action === "approve" && !window.confirm(`Phê duyệt phiếu ${ticket.ticketId}?`)) return;
    setProcessingTransferId(ticket.first.id);
    try {
      if (action === "approve") await approveTransfer(ticket.first.id, reason || undefined);
      if (action === "reject") await rejectTransfer(ticket.first.id, reason);
      if (action === "cancel") await cancelTransfer(ticket.first.id, reason);
      toast.success(
        action === "approve"
          ? "Đã phê duyệt phiếu"
          : action === "reject"
            ? "Đã từ chối phiếu"
            : "Đã hủy phiếu",
      );
      setDecisionReasons((current) => {
        const next = { ...current };
        delete next[ticket.first.id];
        return next;
      });
      setSelectedTicket(null);
      await refresh();
    } catch (error) {
      toast.error(readError(error));
    } finally {
      setProcessingTransferId(null);
    }
  };

  const openTransferDocument = async (objectKey: string) => {
    const previewWindow = window.open("", "_blank");
    try {
      const blob = await downloadTransferDocument(objectKey);
      const url = URL.createObjectURL(blob);
      if (previewWindow) previewWindow.location.href = url;
      else window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      previewWindow?.close();
      toast.error(readError(error));
    }
  };

  const renderTicketDetails = (ticket: TransferGroup) => {
    const transfer = ticket.first;
    const decisionLabel =
      transfer.status === "REJECTED"
        ? "Từ chối bởi"
        : transfer.status === "APPROVED"
          ? "Duyệt bởi"
          : "Người xử lý";
    const siteName = (id?: number) =>
      id ? workSites.find((site) => site.id === id)?.name || "Chưa có" : "BIMLAB";
    const departmentName = (id?: number) =>
      departments.find((department) => department.id === id)?.name || "Chưa có";
    return (
      <div className="transfer-ticket-detail">
        <div className="asset-detail-hero">
          <div>
            <span>Mã phiếu</span>
            <strong>{ticket.ticketId}</strong>
          </div>
          <div>
            <span>Trạng thái</span>
            <strong className={transferStatusBadgeClass(transfer.status)}>{ticket.status}</strong>
          </div>
          <div>
            <span>{decisionLabel}</span>
            <strong>{transfer.approvedBy?.replace(/\s+\([^)]*\)$/, "") || "--"}</strong>
          </div>
        </div>

        <section className="transfer-detail-block">
          <h3>Thông tin chung</h3>
          <div className="transfer-detail-fields">
            <div>
              <span>Tiêu đề</span>
              <strong>{transfer.title || "--"}</strong>
            </div>
            <div>
              <span>Phân loại</span>
              <strong>{transfer.transferType}</strong>
            </div>
            <div>
              <span>Ngày tạo đơn</span>
              <strong>{formatTransferDateTime(transfer.createdAt)}</strong>
            </div>
            <div>
              <span>Ngày thực hiện</span>
              <strong>{formatTransferDate(transfer.transferDate)}</strong>
            </div>
            <div>
              <span>Người tạo phiếu</span>
              <strong>{transfer.requestedBy || "--"}</strong>
            </div>
            <div>
              <span>Người nhận</span>
              <strong>{empLabel(transfer.toEmployeeId)}</strong>
            </div>
            <div>
              <span>Chi nhánh nhận</span>
              <strong>{siteName(transfer.toSiteId)}</strong>
            </div>
            <div>
              <span>Phòng ban nhận</span>
              <strong>{departmentName(transfer.toDepartmentId)}</strong>
            </div>
            <div className="transfer-detail-wide">
              <span>Lý do</span>
              <strong>{transfer.reason || "--"}</strong>
            </div>
            {transfer.note && (
              <div className="transfer-detail-wide">
                <span>Ghi chú xử lý</span>
                <strong>{transfer.note}</strong>
              </div>
            )}
            {transfer.cancelReason && (
              <div className="transfer-detail-wide">
                <span>Lý do hủy</span>
                <strong>{transfer.cancelReason}</strong>
              </div>
            )}
          </div>
        </section>

        <section className="transfer-detail-block">
          <h3>Người xét duyệt</h3>
          <div className="transfer-detail-people">
            {transfer.confirmations?.length ? (
              transfer.confirmations.map((confirmation) => (
                <div className="transfer-approver-item" key={confirmation.id}>
                  <strong>
                    {confirmation.confirmerName || empLabel(confirmation.confirmerEmployeeId)}
                  </strong>
                  <span className={transferStatusBadgeClass(confirmation.status)}>
                    {confirmationStatusLabel(confirmation.status)}
                  </span>
                </div>
              ))
            ) : (
              <span>Không chỉ định, người có quyền duyệt sẽ xử lý</span>
            )}
          </div>
        </section>

        <section className="transfer-detail-block">
          <h3>Danh sách tài sản luân chuyển</h3>
          <div className="table-wrap transfer-detail-table-wrap">
            <table className="transfer-detail-table" aria-label="Danh sách tài sản luân chuyển">
              <thead>
                <tr>
                  <th className="table-index-header">STT</th>
                  <th>Tài sản</th>
                  <th>Từ</th>
                  <th>Đến</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {ticket.assets.map((line, index) => {
                  const asset = assets.find((item) => item.id === line.assetId);
                  return (
                    <tr key={line.id ?? line.assetId}>
                      <td className="table-index-cell">{index + 1}</td>
                      <td>
                        <strong>{line.assetCode || asset?.assetCode || `#${line.assetId}`}</strong>
                        <span>{line.assetName || asset?.name || "--"}</span>
                      </td>
                      <td>
                        <span>Chi nhánh: {siteName(line.fromSiteId)}</span>
                        <span>Phòng ban: {departmentName(line.fromDepartmentId)}</span>
                        <span>Nhân viên: {empLabel(line.fromEmployeeId)}</span>
                      </td>
                      <td>
                        {transfer.transferType === "REVOKE" ||
                        transfer.transferType === "Thu hồi" ? (
                          <span>Thu hồi về kho, gỡ toàn bộ thông tin gán</span>
                        ) : (
                          <>
                            <span>Chi nhánh: {siteName(line.toSiteId ?? transfer.toSiteId)}</span>
                            <span>
                              Phòng ban:{" "}
                              {departmentName(line.toDepartmentId ?? transfer.toDepartmentId)}
                            </span>
                            <span>
                              Nhân viên: {empLabel(line.toEmployeeId ?? transfer.toEmployeeId)}
                            </span>
                          </>
                        )}
                      </td>
                      <td>{line.receiverNote || "--"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="transfer-detail-block">
          <h3>Tệp đính kèm</h3>
          <div className="transfer-detail-documents">
            {transfer.documents?.length ? (
              transfer.documents.map((document) =>
                document.objectKey ? (
                  <button
                    type="button"
                    className="transfer-attachment-link"
                    key={document.id ?? document.fileName}
                    onClick={() => void openTransferDocument(document.objectKey as string)}
                  >
                    {document.fileName}
                  </button>
                ) : (
                  <span key={document.id ?? document.fileName}>{document.fileName}</span>
                ),
              )
            ) : (
              <span>Không có tệp đính kèm</span>
            )}
          </div>
        </section>
      </div>
    );
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
        </div>
      </div>

      {view === "list" && (
        <section className="panel">
          <div className="panel-body" style={{ padding: "24px" }}>
            <div className="transfer-list-heading">
              <h2>Danh sách phiếu bàn giao</h2>
              {canManage && (
                <button
                  type="button"
                  className="primary-action transfer-list-add-button btn-download-green"
                  onClick={() => handleTabChange("create")}
                >
                  <FiPlus /> Thêm mới
                </button>
              )}
            </div>
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
                  <option value="Đã từ chối">Đã từ chối</option>
                  <option value="Đã hủy">Đã hủy</option>
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
              <table className="transfer-list-table">
                <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <tr>
                    <th
                      className="table-index-header"
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
                      Ngày tạo đơn
                    </th>
                    <th
                      style={{
                        padding: "12px 16px",
                        color: "#64748b",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      Mã phiếu
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
                      <tr key={ticket.ticketId}>
                        <td
                          className="table-index-cell"
                          style={{ padding: "12px 16px", fontWeight: 500 }}
                        >
                          {(safeListPage - 1) * listPageSize + index + 1}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {formatTransferDateTime(ticket.first.createdAt)}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#2563eb" }}>
                          {ticket.ticketId}
                        </td>
                        <td style={{ padding: "12px 16px" }}>{ticket.transferType}</td>
                        <td style={{ padding: "12px 16px" }}>{ticket.reason || "--"}</td>
                        <td style={{ padding: "12px 16px" }}>
                          {formatTransferDate(ticket.transferDate)}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span className={transferStatusBadgeClass(ticket.first.status)}>
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

            <div className="transfer-list-footer">
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
          </div>
        </section>
      )}

      {view === "list" && (canApprove || hasAssignedPending) && (
        <section className="panel transfer-pending-panel">
          <div className="panel-body">
            <div className="transfer-pending-heading">
              <div>
                <h2>Phiếu cần xét duyệt</h2>
              </div>
              <strong>{pendingTransfers.length} phiếu</strong>
            </div>
            <div className="category-filters transfer-pending-filters">
              <div className="category-filter">
                <SearchableSelect value={pendingType} onChange={setPendingType}>
                  <option value="">Tất cả phân loại</option>
                  <option value="Bàn giao">Bàn giao</option>
                  <option value="Thu hồi">Thu hồi</option>
                </SearchableSelect>
              </div>
              <div className="category-filter">
                <input
                  type="date"
                  aria-label="Ngày phiếu chờ duyệt"
                  value={pendingDate}
                  onChange={(event) => setPendingDate(event.target.value)}
                  style={formInputStyle}
                />
              </div>
              <div className="category-filter transfer-pending-search">
                <input
                  type="search"
                  value={pendingSearch}
                  onChange={(event) => setPendingSearch(event.target.value)}
                  placeholder="Tìm mã phiếu, tiêu đề hoặc lý do..."
                  style={formInputStyle}
                />
              </div>
            </div>
            <div className="transfer-pending-list">
              {pagedPendingTransfers.length ? (
                pagedPendingTransfers.map((ticket) => {
                  const assignedToMe = ticket.first.confirmations?.some(
                    (confirmation) => confirmation.confirmerEmployeeId === user?.id,
                  );
                  const canDecide = canApprove || assignedToMe;
                  const processing = processingTransferId === ticket.first.id;
                  const title = ticket.first.title || "";
                  const normalizedSearch = pendingSearch.trim().toLowerCase();
                  const summaryText =
                    normalizedSearch &&
                    !title.toLowerCase().includes(normalizedSearch) &&
                    ticket.reason.toLowerCase().includes(normalizedSearch)
                      ? ticket.reason
                      : title || ticket.reason || "--";
                  return (
                    <article className="transfer-pending-card" key={ticket.first.id}>
                      <div className="transfer-pending-summary">
                        <div className="transfer-pending-identity">
                          <strong>{highlightTransferText(ticket.ticketId, pendingSearch)}</strong>
                          <span>{highlightTransferText(summaryText, pendingSearch)}</span>
                        </div>
                        <div className="transfer-pending-meta">
                          <span>
                            <small>Phân loại</small>
                            <strong>{ticket.transferType}</strong>
                          </span>
                          <span>
                            <small>Ngày thực hiện</small>
                            <strong>{formatTransferDate(ticket.transferDate)}</strong>
                          </span>
                        </div>
                        <span className={transferStatusBadgeClass(ticket.first.status)}>
                          {ticket.status}
                        </span>
                        <button
                          type="button"
                          className="transfer-pending-detail-button"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <FiEye /> Xem chi tiết
                        </button>
                      </div>
                      <div className="transfer-pending-actions">
                        <input
                          type="text"
                          aria-label={`Lý do xử lý ${ticket.ticketId}`}
                          value={decisionReasons[ticket.first.id] || ""}
                          onChange={(event) =>
                            setDecisionReasons((current) => ({
                              ...current,
                              [ticket.first.id]: event.target.value,
                            }))
                          }
                          placeholder="Nhập lý do khi từ chối hoặc hủy phiếu..."
                        />
                        <div>
                          {canCancelTicket(ticket) && (
                            <button
                              type="button"
                              className="secondary danger"
                              disabled={processing}
                              onClick={() => void handleDecision(ticket, "cancel")}
                            >
                              Hủy phiếu
                            </button>
                          )}
                          {canDecide && (
                            <>
                              <button
                                type="button"
                                className="secondary danger transfer-reject-button"
                                disabled={processing}
                                onClick={() => void handleDecision(ticket, "reject")}
                              >
                                Từ chối
                              </button>
                              <button
                                type="button"
                                className="primary-action"
                                disabled={processing}
                                onClick={() => void handleDecision(ticket, "approve")}
                              >
                                Phê duyệt
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="empty-state">Không có phiếu nào đang chờ bạn xét duyệt.</div>
              )}
            </div>
            <TransferListPagination
              page={safePendingPage}
              pageSize={pendingPageSize}
              total={pendingTransfers.length}
              onPageChange={setPendingPage}
              onPageSizeChange={(size) => {
                setPendingPageSize(size);
                setPendingPage(1);
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
            style={{ width: "1100px", maxWidth: "94vw" }}
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

            {renderTicketDetails(selectedTicket)}

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
              className="transfer-form-top-grid"
              style={{ display: "flex", gap: "24px", alignItems: "flex-start", flexWrap: "wrap" }}
            >
              {/* Thông tin chung */}
              <div
                className="transfer-form-block"
                style={{ flex: 2, minWidth: "400px", background: "#f1f5f9", padding: "12px" }}
              >
                <h3
                  style={{
                    margin: "0 0 10px",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#0f172a",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: "12px",
                  }}
                >
                  Thông tin chung
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={formLabelStyle}>Ngày tạo đơn</span>
                    <input
                      type="text"
                      value="Tự động ghi khi gửi phiếu thành công"
                      readOnly
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
                      min={minimumTransferDate()}
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

                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={formLabelStyle}>Chi nhánh</span>
                    <SearchableSelect
                      value={toSiteId}
                      disabled={isRevoke}
                      onChange={(value) => {
                        setToSiteId(value);
                        setToDepartmentId("");
                        setToEmployeeId("");
                      }}
                    >
                      <option value={DEFAULT_SITE_VALUE}>BIMLAB</option>
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
                      disabled={isRevoke || !toSiteId}
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
                      disabled={isRevoke || !toDepartmentId}
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
              <div
                className="transfer-form-block"
                style={{ flex: 1, minWidth: "280px", background: "#f1f5f9", padding: "12px" }}
              >
                <h3
                  style={{
                    margin: "0 0 10px",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#0f172a",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: "12px",
                  }}
                >
                  Xét duyệt & Tệp đính kèm
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {/* Chỉ định người xét duyệt */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                      background: "#f8fafc",
                      padding: "8px",
                      borderRadius: "4px",
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
                      title="Chọn nhân sự phê duyệt phiếu này. Nếu không chỉ định, người có quyền duyệt phiếu sẽ xử lý."
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
                          gap: "5px",
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
                                {approvedByUsers.includes(String(e.id)) ? "✓ " : ""}
                                {approverName(e)}
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
                              gap: "3px",
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
                                    padding: "3px 8px",
                                    borderRadius: "2px",
                                    border: "1px solid #e2e8f0",
                                    fontSize: "13px",
                                  }}
                                >
                                  <span style={{ color: "#0f172a" }}>
                                    {emp ? approverName(emp) : empIdStr}
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
                      gap: "5px",
                      background: "#f8fafc",
                      padding: "8px",
                      borderRadius: "4px",
                    }}
                    title="Đính kèm hồ sơ liên quan. Hỗ trợ PDF, DOC/DOCX, XLS/XLSX và các định dạng ảnh thông dụng."
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
                          gap: "3px",
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
                                padding: "3px 8px",
                                borderRadius: "2px",
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
                          {selectedAssetIds.includes(a.id) ? "✓ " : ""}
                          {a.assetCode} · {a.name}
                          {selectedAssetIds.includes(a.id) ? " (đã chọn)" : ""}
                        </option>
                      ))}
                    </SearchableSelect>
                  </div>
                </div>
              </div>

              <div
                className="table-wrap transfer-create-assets-wrap"
                style={{
                  border: "1px solid var(--qlvt-border, #e2e8f0)",
                  borderRadius: "8px",
                  overflow: "auto",
                }}
              >
                <table
                  className="transfer-create-assets-table"
                  style={{
                    width: "100%",
                    minWidth: "920px",
                    tableLayout: "fixed",
                    textAlign: "left",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead style={{ background: "#f8fafc", position: "sticky", top: 0, zIndex: 1 }}>
                    <tr>
                      <th
                        className="table-index-header"
                        style={{
                          padding: "12px 16px",
                          color: "#64748b",
                          fontSize: "13px",
                          fontWeight: 600,
                          borderBottom: "1px solid #e2e8f0",
                          width: "54px",
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
                          width: "180px",
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
                          width: "230px",
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
                          width: "250px",
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
                          width: "56px",
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

                        const siteName =
                          toSiteId === DEFAULT_SITE_VALUE
                            ? "BIMLAB"
                            : toSiteId
                              ? workSites.find((s) => s.id === Number(toSiteId))?.name
                              : "";
                        const deptName = toDepartmentId
                          ? departments.find((d) => d.id === Number(toDepartmentId))?.name
                          : "";
                        const eName = toEmployeeId ? empLabel(Number(toEmployeeId)) : "";
                        return (
                          <tr key={id} className="transfer-create-asset-row">
                            <td
                              className="table-index-cell"
                              style={{ padding: "12px 16px", fontWeight: 500 }}
                            >
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
                className="asset-add-button transfer-submit-button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || selectedAssetIds.length === 0}
                style={{ padding: "10px 24px" }}
              >
                Gửi phiếu bàn giao
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
