interface StatusBadgeProps {
  value?: string;
}

const labelMap: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngưng hoạt động",
  IN_STOCK: "Trong kho",
  ASSIGNED: "Đã cấp phát",
  MAINTENANCE: "Bảo trì",
  DISPOSED: "Đã thanh lý",
  LIQUIDATED: "Đã thanh lý",
  DRAFT: "Bản nháp",
  PENDING: "Chờ duyệt",
  PENDING_APPROVAL: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  CONFIRMED: "Đã xác nhận",
  IN_USE: "Đang sử dụng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  REJECTED: "Từ chối",
  EXPIRED: "Quá hạn",
};

export function StatusBadge({ value }: StatusBadgeProps) {
  const status = value || "UNKNOWN";
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>{labelMap[status] || status}</span>
  );
}
