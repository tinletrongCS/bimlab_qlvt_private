import { type ReactNode, useEffect, useMemo, useState } from "react";
import { FiPlus, FiSearch, FiSettings, FiX } from "react-icons/fi";
import { DataTable } from "../components/DataTable";
import { SearchableSelect } from "../components/forms/SearchableSelect";
import { OverflowActions } from "../components/OverflowActions";
import { StatusBadge } from "../components/StatusBadge";
import { useActions } from "../contexts/ActionsContext";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import type { Vendor } from "../services/types";

type VendorStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type VendorColumnId =
  | "name"
  | "taxCode"
  | "contactName"
  | "email"
  | "phone"
  | "address"
  | "website"
  | "bankName"
  | "bankAccountNumber"
  | "status";

const VENDOR_COLUMN_STORAGE_KEY = "qlvt.vendorList.visibleColumns.v1";
const VENDOR_COLUMNS: Array<{ id: VendorColumnId; label: string; locked?: boolean }> = [
  { id: "name", label: "Nhà cung cấp", locked: true },
  { id: "taxCode", label: "Mã số thuế", locked: true },
  { id: "contactName", label: "Người liên hệ" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Điện thoại" },
  { id: "address", label: "Địa chỉ", locked: true },
  { id: "website", label: "Website" },
  { id: "bankName", label: "Ngân hàng" },
  { id: "bankAccountNumber", label: "Số tài khoản" },
  { id: "status", label: "Trạng thái" },
];

function readVisibleVendorColumns(): VendorColumnId[] {
  try {
    const raw = window.localStorage.getItem(VENDOR_COLUMN_STORAGE_KEY);
    if (!raw) return VENDOR_COLUMNS.map(({ id }) => id);
    const saved = JSON.parse(raw);
    const known = new Set(VENDOR_COLUMNS.map((column) => column.id));
    const visible = Array.isArray(saved)
      ? saved.filter((id): id is VendorColumnId => known.has(id))
      : [];
    return Array.from(
      new Set([
        ...visible,
        ...VENDOR_COLUMNS.filter((column) => column.locked).map(({ id }) => id),
      ]),
    );
  } catch {
    return VENDOR_COLUMNS.map(({ id }) => id);
  }
}

export function VendorsPage() {
  const { hasPermission } = useAuth();
  const { vendors, ensureVendors } = useAppData();
  const { openModal, deleteResource } = useActions();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<VendorStatusFilter>("ALL");
  const [visibleColumns, setVisibleColumns] = useState<VendorColumnId[]>(readVisibleVendorColumns);
  const [columnConfigOpen, setColumnConfigOpen] = useState(false);
  const [detailVendor, setDetailVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    void ensureVendors();
  }, [ensureVendors]);

  useEffect(() => {
    window.localStorage.setItem(VENDOR_COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const canManage = hasPermission("vendor_manage") || hasPermission("asset_manage");
  const filteredVendors = useMemo(() => {
    const keyword = normalizeSearch(query);
    return vendors.filter((vendor) => {
      if (statusFilter !== "ALL" && vendor.status !== statusFilter) return false;
      if (!keyword) return true;
      return normalizeSearch(
        [
          vendor.name,
          vendor.taxCode,
          vendor.contactName,
          vendor.email,
          vendor.phone,
          vendor.address,
          vendor.website,
          vendor.bankName,
          vendor.bankAccountNumber,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(keyword);
    });
  }, [query, statusFilter, vendors]);

  const activeCount = vendors.filter((vendor) => vendor.status === "ACTIVE").length;
  const visibleColumnSet = new Set(visibleColumns);
  const tableColumns = [
    {
      key: "name",
      title: "Nhà cung cấp",
      className: "vendor-col-name",
      render: (item: Vendor) => <strong className="vendor-primary-cell">{item.name}</strong>,
    },
    {
      key: "taxCode",
      title: "Mã số thuế",
      className: "vendor-col-taxCode",
      render: (item: Vendor) => item.taxCode || "--",
    },
    {
      key: "contactName",
      title: "Người liên hệ",
      className: "vendor-col-contactName",
      render: (item: Vendor) => item.contactName || "--",
    },
    {
      key: "email",
      title: "Email",
      className: "vendor-col-email",
      render: (item: Vendor) => item.email || "--",
    },
    {
      key: "phone",
      title: "Điện thoại",
      className: "vendor-col-phone",
      render: (item: Vendor) => item.phone || "--",
    },
    {
      key: "address",
      title: "Địa chỉ",
      className: "vendor-col-address",
      render: (item: Vendor) => <span className="vendor-address-cell">{item.address || "--"}</span>,
    },
    {
      key: "website",
      title: "Website",
      className: "vendor-col-website",
      render: (item: Vendor) =>
        item.website ? (
          <a href={websiteUrl(item.website)} target="_blank" rel="noreferrer">
            {item.website}
          </a>
        ) : (
          "--"
        ),
    },
    {
      key: "bankName",
      title: "Ngân hàng",
      className: "vendor-col-bankName",
      render: (item: Vendor) => item.bankName || "--",
    },
    {
      key: "bankAccountNumber",
      title: "Số tài khoản",
      className: "vendor-col-bankAccountNumber",
      render: (item: Vendor) => item.bankAccountNumber || "--",
    },
    {
      key: "status",
      title: "Trạng thái",
      className: "vendor-col-status",
      render: (item: Vendor) => <StatusBadge value={item.status} />,
    },
  ].filter((column) => visibleColumnSet.has(column.key as VendorColumnId));

  return (
    <section className="asset-page vendor-page panel">
      <header className="asset-page-header">
        <div>
          <h2>Nhà cung cấp</h2>
        </div>
      </header>

      {canManage && (
        <div className="asset-page-actions vendor-page-actions">
          <button
            type="button"
            className="asset-add-button btn-download-green vendor-add-button"
            onClick={() => openModal({ type: "vendor", mode: "create" })}
          >
            <FiPlus /> Thêm nhà cung cấp
          </button>
        </div>
      )}

      <div className="asset-toolbar vendor-toolbar">
        <label className="asset-search">
          <FiSearch />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, mã số thuế, liên hệ, ngân hàng..."
          />
        </label>
        <label className="asset-filter-field">
          <span>Trạng thái</span>
          <SearchableSelect
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as VendorStatusFilter)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngưng hoạt động</option>
          </SearchableSelect>
        </label>
      </div>

      <div className="asset-list-panel vendor-list-panel">
        <div className="asset-list-head vendor-list-head">
          <strong>Danh sách nhà cung cấp</strong>
          <div className="vendor-list-head-tools">
            <span>
              {filteredVendors.length}/{vendors.length} nhà cung cấp · {activeCount} đang hoạt động
            </span>
            <button
              type="button"
              className="asset-table-text-action asset-column-config-toggle"
              aria-expanded={columnConfigOpen}
              onClick={() => setColumnConfigOpen((open) => !open)}
            >
              <FiSettings /> Cấu hình cột
            </button>
          </div>
        </div>
        {columnConfigOpen && (
          <>
            <button
              type="button"
              className="asset-column-backdrop"
              aria-label="Đóng cấu hình cột"
              onClick={() => setColumnConfigOpen(false)}
            />
            <div className="asset-column-popover" role="dialog" aria-modal="true">
              <div className="asset-column-popover-head">
                <div>
                  <strong>Cấu hình cột</strong>
                  <span>Bật hoặc tắt các cột cần xem. Ba cột nghiệp vụ chính luôn hiển thị.</span>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Đóng"
                  onClick={() => setColumnConfigOpen(false)}
                >
                  <FiX />
                </button>
              </div>
              <div className="asset-column-list">
                {VENDOR_COLUMNS.map((column) => {
                  const checked = visibleColumnSet.has(column.id) || Boolean(column.locked);
                  return (
                    <label
                      key={column.id}
                      className={`asset-column-option ${column.locked ? "is-locked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={column.locked}
                        onChange={() =>
                          setVisibleColumns((current) =>
                            current.includes(column.id)
                              ? current.filter((id) => id !== column.id)
                              : [...current, column.id],
                          )
                        }
                      />
                      <span>{column.label}</span>
                      {column.locked && <em>Bắt buộc</em>}
                    </label>
                  );
                })}
              </div>
              <div className="asset-column-popover-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setVisibleColumns(VENDOR_COLUMNS.map(({ id }) => id))}
                >
                  Mặc định
                </button>
                <button type="button" onClick={() => setColumnConfigOpen(false)}>
                  Áp dụng
                </button>
              </div>
            </div>
          </>
        )}
        <DataTable
          data={filteredVendors}
          getRowKey={(item) => item.id}
          emptyText={
            query || statusFilter !== "ALL" ? "Không tìm thấy nhà cung cấp" : "Chưa có nhà cung cấp"
          }
          itemLabel="nhà cung cấp"
          tableMinWidth={Math.max(760, tableColumns.length * 150 + 100)}
          columns={[
            ...tableColumns,
            {
              key: "actions",
              title: "Thao tác",
              className: "vendor-col-actions",
              render: (item) => (
                <OverflowActions
                  label={`Mở thao tác cho ${item.name}`}
                  actions={[
                    {
                      label: "Xem chi tiết",
                      onClick: () => setDetailVendor(item),
                    },
                    ...(canManage
                      ? [
                          {
                            label: "Sửa thông tin",
                            onClick: () => openModal({ type: "vendor", mode: "edit", item }),
                          },
                          ...(item.status !== "INACTIVE"
                            ? [
                                {
                                  label: "Ngưng hoạt động",
                                  danger: true,
                                  onClick: () => void deleteResource("vendors", item.id),
                                },
                              ]
                            : []),
                        ]
                      : []),
                  ]}
                />
              ),
            },
          ]}
        />
      </div>

      {detailVendor && (
        <div className="modal-backdrop" onMouseDown={() => setDetailVendor(null)}>
          <section
            className="vendor-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vendor-detail-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2 id="vendor-detail-title">Chi tiết nhà cung cấp</h2>
                <p>{detailVendor.name}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Đóng"
                onClick={() => setDetailVendor(null)}
              >
                <FiX />
              </button>
            </div>
            <div className="vendor-detail-grid">
              <VendorDetailField label="Tên nhà cung cấp" value={detailVendor.name} wide />
              <VendorDetailField label="Mã số thuế" value={detailVendor.taxCode} />
              <VendorDetailField
                label="Trạng thái"
                value={<StatusBadge value={detailVendor.status} />}
              />
              <VendorDetailField label="Người liên hệ" value={detailVendor.contactName} />
              <VendorDetailField label="Điện thoại" value={detailVendor.phone} />
              <VendorDetailField label="Email" value={detailVendor.email} />
              <VendorDetailField label="Website" value={detailVendor.website} />
              <VendorDetailField label="Địa chỉ" value={detailVendor.address} wide />
              <VendorDetailField label="Ngân hàng" value={detailVendor.bankName} />
              <VendorDetailField label="Số tài khoản" value={detailVendor.bankAccountNumber} />
            </div>
            <div className="modal-actions">
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setDetailVendor(null);
                    openModal({ type: "vendor", mode: "edit", item: detailVendor });
                  }}
                >
                  Sửa thông tin
                </button>
              )}
              <button type="button" className="secondary" onClick={() => setDetailVendor(null)}>
                Đóng
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function VendorDetailField({
  label,
  value,
  wide = false,
}: {
  label: string;
  value?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "wide" : undefined}>
      <span>{label}</span>
      <strong>{value || "--"}</strong>
    </div>
  );
}

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function websiteUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}
