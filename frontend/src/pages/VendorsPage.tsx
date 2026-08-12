import { useEffect, useMemo, useState } from "react";
import { FiPlus, FiSearch } from "react-icons/fi";
import { DataTable } from "../components/DataTable";
import { SearchableSelect } from "../components/forms/SearchableSelect";
import { OverflowActions } from "../components/OverflowActions";
import { StatusBadge } from "../components/StatusBadge";
import { useActions } from "../contexts/ActionsContext";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";

type VendorStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export function VendorsPage() {
  const { hasPermission } = useAuth();
  const { vendors, ensureVendors } = useAppData();
  const { openModal, deleteResource } = useActions();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<VendorStatusFilter>("ALL");

  useEffect(() => {
    void ensureVendors();
  }, [ensureVendors]);

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
          <span>
            {filteredVendors.length}/{vendors.length} nhà cung cấp · {activeCount} đang hoạt động
          </span>
        </div>
        <DataTable
          data={filteredVendors}
          getRowKey={(item) => item.id}
          emptyText={
            query || statusFilter !== "ALL" ? "Không tìm thấy nhà cung cấp" : "Chưa có nhà cung cấp"
          }
          itemLabel="nhà cung cấp"
          tableMinWidth={1120}
          columns={[
            {
              key: "name",
              title: "Nhà cung cấp",
              className: "vendor-col-name",
              render: (item) => (
                <div className="vendor-name-cell">
                  <strong>{item.name}</strong>
                  {item.website && (
                    <a href={websiteUrl(item.website)} target="_blank" rel="noreferrer">
                      {item.website}
                    </a>
                  )}
                </div>
              ),
            },
            {
              key: "tax",
              title: "Mã số thuế",
              className: "vendor-col-tax",
              render: (item) => item.taxCode || "--",
            },
            {
              key: "contact",
              title: "Thông tin liên hệ",
              className: "vendor-col-contact",
              render: (item) => (
                <div className="vendor-contact-cell">
                  <strong>{item.contactName || "--"}</strong>
                  {item.phone && <span>{item.phone}</span>}
                  {item.email && <span>{item.email}</span>}
                </div>
              ),
            },
            {
              key: "address",
              title: "Địa chỉ",
              className: "vendor-col-address",
              render: (item) => <span className="vendor-address-cell">{item.address || "--"}</span>,
            },
            {
              key: "bank",
              title: "Thanh toán",
              className: "vendor-col-bank",
              render: (item) => (
                <div className="vendor-bank-cell">
                  <strong>{item.bankName || "--"}</strong>
                  {item.bankAccountNumber && <span>{item.bankAccountNumber}</span>}
                </div>
              ),
            },
            {
              key: "status",
              title: "Trạng thái",
              className: "vendor-col-status",
              render: (item) => <StatusBadge value={item.status} />,
            },
            {
              key: "actions",
              title: "Thao tác",
              className: "vendor-col-actions",
              render: (item) =>
                canManage ? (
                  <OverflowActions
                    label={`Mở thao tác cho ${item.name}`}
                    actions={[
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
                    ]}
                  />
                ) : null,
            },
          ]}
        />
      </div>
    </section>
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
