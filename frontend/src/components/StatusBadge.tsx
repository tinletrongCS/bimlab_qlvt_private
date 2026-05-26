interface StatusBadgeProps {
  value?: string;
}

const labelMap: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Ngưng hoạt động",
  IN_STOCK: "Trong kho",
  ASSIGNED: "Đã cấp phát",
  MAINTENANCE: "Bảo trì",
  LIQUIDATED: "Đã thanh lý",
  DRAFT: "Bản nháp",
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

export function StatusBadge({ value }: StatusBadgeProps) {
  const status = value || "UNKNOWN";
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>{labelMap[status] || status}</span>
  );
}
