import { type FormEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiPlus, FiSearch } from "react-icons/fi";
import { CrudModal } from "../components/CrudModal";
import { DataTable } from "../components/DataTable";
import { AssetCategoryTreeSelect } from "../components/forms/AssetCategoryTreeSelect";
import { Field, FormLabel } from "../components/forms/FormFields";
import { RichTextEditor, richTextStorageValue } from "../components/forms/RichTextEditor";
import { SearchableSelect } from "../components/forms/SearchableSelect";
import { OverflowActions } from "../components/OverflowActions";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../contexts/AuthContext";
import {
  createAssetCatalogItem,
  deactivateAssetCatalogItem,
  loadAssetCatalogItem,
  loadAssetCatalogItems,
  loadAssetCategories,
  updateAssetCatalogItem,
} from "../services/api";
import type {
  AssetCatalogItemDetail,
  AssetCatalogItemListItem,
  AssetCatalogItemPayload,
  AssetCatalogType,
  AssetCategory,
  CatalogUnit,
} from "../services/types";

type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";
type TypeFilter = "ALL" | AssetCatalogType;

interface CatalogFormState {
  itemCode: string;
  name: string;
  categoryId: number | null;
  categoryName: string;
  categoryCode: string;
  catalogType: AssetCatalogType;
  inventoryGroup: string;
  unit: CatalogUnit | "";
  costValue: string;
  standardValue: string;
  fixedValue: string;
  internalValue: string;
  technicalSpec: string;
  active: boolean;
}

const EMPTY_FORM: CatalogFormState = {
  itemCode: "",
  name: "",
  categoryId: null,
  categoryName: "",
  categoryCode: "",
  catalogType: "ASSET",
  inventoryGroup: "",
  unit: "",
  costValue: "",
  standardValue: "",
  fixedValue: "",
  internalValue: "",
  technicalSpec: "",
  active: true,
};

const TYPE_LABELS: Record<AssetCatalogType, string> = {
  ASSET: "Tài sản",
  TOOL: "Công cụ dụng cụ",
  MATERIAL: "Vật tư",
  PRODUCT_REFERENCE: "Sản phẩm tham chiếu",
};

const AVAILABILITY_LABELS = {
  ACTIVE: "Có thể gán",
  INACTIVE: "Ngừng gán",
} as const;

const UNIT_LABELS: Record<CatalogUnit, string> = {
  CAI: "Cái",
  CHIEC: "Chiếc",
  BO: "Bộ",
  CAP: "Cặp",
  HOP: "Hộp",
  THUNG: "Thùng",
  GOI: "Gói",
  CUON: "Cuộn",
  MET: "Mét",
  MET_VUONG: "Mét vuông",
  MET_KHOI: "Mét khối",
  KILOGRAM: "Kilôgam",
  TAN: "Tấn",
  LIT: "Lít",
  CHAI: "Chai",
  TAM: "Tấm",
  THANH: "Thanh",
};

export function AssetCatalogItemsPage() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<AssetCatalogItemListItem[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CatalogFormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const canManage = hasPermission("asset_manage");

  useEffect(() => {
    Promise.all([loadAssetCatalogItems(), loadAssetCategories()])
      .then(([catalogItems, assetCategories]) => {
        setItems(catalogItems);
        setCategories(assetCategories);
      })
      .catch(() => toast.error("Không tải được danh sách danh mục tài sản."));
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = normalize(query);
    return items.filter((item) => {
      if (categoryFilter !== "ALL" && item.categoryId !== Number(categoryFilter)) return false;
      if (typeFilter !== "ALL" && item.catalogType !== typeFilter) return false;
      if (activeFilter === "ACTIVE" && !item.active) return false;
      if (activeFilter === "INACTIVE" && item.active) return false;
      return (
        !keyword ||
        normalize(`${item.itemCode} ${item.name} ${item.categoryName} ${item.unit || ""}`).includes(
          keyword,
        )
      );
    });
  }, [activeFilter, categoryFilter, items, query, typeFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = async (id: number) => {
    setBusy(true);
    try {
      const item = await loadAssetCatalogItem(id);
      const itemCategory = categories.find((category) => category.id === item.categoryId);
      const nextForm = formFromDetail(item);
      setEditingId(id);
      setForm({
        ...nextForm,
        catalogType: itemCategory
          ? catalogTypeForAssetClass(itemCategory.assetClass)
          : nextForm.catalogType,
      });
      setModalOpen(true);
    } catch {
      toast.error("Không tải được chi tiết danh mục.");
    } finally {
      setBusy(false);
    }
  };

  const closeModal = () => {
    if (!busy) setModalOpen(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.categoryId) {
      toast.error("Chọn loại tài sản cho danh mục.");
      return;
    }

    const payload: AssetCatalogItemPayload = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      catalogType: form.catalogType,
      inventoryGroup: emptyToUndefined(form.inventoryGroup),
      unit: form.unit || undefined,
      costValue: numberOrNull(form.costValue),
      standardValue: numberOrNull(form.standardValue),
      fixedValue: numberOrNull(form.fixedValue),
      internalValue: numberOrNull(form.internalValue),
      technicalSpec: emptyToUndefined(richTextStorageValue(form.technicalSpec)),
      active: form.active,
    };

    setBusy(true);
    try {
      if (editingId) await updateAssetCatalogItem(editingId, payload);
      else await createAssetCatalogItem(payload);
      setItems(await loadAssetCatalogItems());
      setModalOpen(false);
      toast.success(editingId ? "Đã cập nhật danh mục." : "Đã tạo danh mục.");
    } catch {
      toast.error("Không lưu được danh mục.");
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (item: AssetCatalogItemListItem) => {
    if (!window.confirm(`Ngừng cho phép gán danh mục "${item.name}" cho tài sản mới?`)) return;
    setBusy(true);
    try {
      await deactivateAssetCatalogItem(item.id);
      setItems(await loadAssetCatalogItems());
      toast.success("Danh mục đã ngừng được phép gán cho tài sản mới.");
    } catch {
      toast.error("Không thể cập nhật khả dụng của danh mục.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="asset-page catalog-page panel">
      <header className="asset-page-header">
        <div>
          <h2>Danh mục tài sản</h2>
        </div>
      </header>

      {canManage && (
        <div className="asset-page-actions catalog-page-actions">
          <button type="button" className="asset-add-button" onClick={openCreate} disabled={busy}>
            <FiPlus /> Thêm danh mục
          </button>
        </div>
      )}

      <div className="asset-toolbar catalog-toolbar">
        <label className="asset-search">
          <FiSearch />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo mã, tên danh mục, loại tài sản..."
          />
        </label>
        <FilterSelect
          label="Loại tài sản"
          value={categoryFilter}
          onChange={setCategoryFilter}
          portal
        >
          <option value="ALL">Tất cả loại tài sản</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.code} - {category.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Kiểu danh mục"
          value={typeFilter}
          onChange={(value) => setTypeFilter(value as TypeFilter)}
        >
          <option value="ALL">Tất cả kiểu</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="Khả dụng"
          value={activeFilter}
          onChange={(value) => setActiveFilter(value as ActiveFilter)}
        >
          <option value="ALL">Tất cả</option>
          <option value="ACTIVE">Có thể gán</option>
          <option value="INACTIVE">Ngừng gán</option>
        </FilterSelect>
      </div>

      <div className="asset-list-panel catalog-list-panel">
        <div className="asset-list-head">
          <strong>Danh sách danh mục</strong>
          <span>
            {filteredItems.length}/{items.length} danh mục
          </span>
        </div>
        <DataTable
          data={filteredItems}
          getRowKey={(item) => item.id}
          emptyText={query ? "Không tìm thấy danh mục" : "Chưa có danh mục tài sản"}
          itemLabel="danh mục"
          pageSizeOptions={[20, 50, 100]}
          tableMinWidth={980}
          columns={[
            { key: "code", title: "Mã danh mục", render: (item) => <b>{item.itemCode}</b> },
            { key: "name", title: "Tên danh mục", render: (item) => item.name },
            {
              key: "category",
              title: "Loại tài sản",
              render: (item) => `${item.categoryCode} - ${item.categoryName}`,
            },
            {
              key: "type",
              title: "Kiểu danh mục",
              render: (item) => TYPE_LABELS[item.catalogType],
            },
            { key: "unit", title: "Đơn vị tính", render: (item) => unitLabel(item.unit) },
            {
              key: "assetCount",
              title: "Số tài sản",
              className: "catalog-col-asset-count",
              render: (item) => item.assetCount ?? 0,
            },
            {
              key: "status",
              title: "Khả dụng",
              render: (item) => {
                const availability = item.active ? "ACTIVE" : "INACTIVE";
                return (
                  <StatusBadge value={availability} label={AVAILABILITY_LABELS[availability]} />
                );
              },
            },
            {
              key: "actions",
              title: "Thao tác",
              className: "catalog-col-actions",
              render: (item) => (
                <OverflowActions
                  label={`Mở thao tác cho ${item.name}`}
                  actions={[
                    {
                      label: "Xem tài sản",
                      onClick: () => openAssetsForCatalog(item),
                    },
                    { label: "Sửa thông tin", onClick: () => void openEdit(item.id) },
                    ...(item.active
                      ? [
                          {
                            label: "Ngừng cho phép gán",
                            danger: true,
                            onClick: () => void deactivate(item),
                          },
                        ]
                      : []),
                  ]}
                />
              ),
            },
          ]}
        />
      </div>

      {modalOpen && (
        <CrudModal
          title={editingId ? "Cập nhật danh mục" : "Thêm danh mục"}
          subtitle="Khai báo thông tin dùng chung cho các tài sản cùng danh mục."
          submitting={busy}
          onClose={closeModal}
          onSubmit={submit}
          wide
          className="catalog-modal"
        >
          <div className="catalog-modal-layout">
            <div className="catalog-modal-fields">
              <CatalogField
                label="Mã danh mục"
                value={form.itemCode}
                onChange={() => undefined}
                disabled
                placeholder="Hệ thống tự sinh"
              />
              <CatalogField
                label="Tên danh mục"
                value={form.name}
                onChange={(value) => setForm({ ...form, name: value })}
                required
              />
              <CatalogField
                label="Kiểu danh mục"
                value={TYPE_LABELS[form.catalogType]}
                onChange={() => undefined}
                disabled
              />
              <CatalogField
                label="Nhóm kiểm kê"
                value={form.inventoryGroup}
                onChange={(value) => setForm({ ...form, inventoryGroup: value })}
              />
              <label>
                <FormLabel>Đơn vị tính</FormLabel>
                <SearchableSelect
                  value={form.unit}
                  onChange={(value) => setForm({ ...form, unit: value as CatalogUnit | "" })}
                  options={[
                    { value: "", label: "Chưa chọn" },
                    ...Object.entries(UNIT_LABELS).map(([value, label]) => ({ value, label })),
                  ]}
                />
              </label>
              <Field
                label="Giá vốn"
                type="currency"
                value={form.costValue}
                onChange={(value) => setForm({ ...form, costValue: value })}
              />
              <Field
                label="Giá tiêu chuẩn"
                type="currency"
                value={form.standardValue}
                onChange={(value) => setForm({ ...form, standardValue: value })}
              />
              <Field
                label="Giá cố định"
                type="currency"
                value={form.fixedValue}
                onChange={(value) => setForm({ ...form, fixedValue: value })}
              />
              <Field
                label="Giá nội bộ"
                type="currency"
                value={form.internalValue}
                onChange={(value) => setForm({ ...form, internalValue: value })}
              />
              <div className="catalog-form-wide">
                <RichTextEditor
                  label="Mô tả kỹ thuật"
                  value={form.technicalSpec}
                  onChange={(value) => setForm({ ...form, technicalSpec: value })}
                  minHeight={150}
                />
              </div>
              <label className="catalog-active-checkbox catalog-form-wide">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm({ ...form, active: event.target.checked })}
                />
                <span>Cho phép gán danh mục này cho tài sản</span>
              </label>
            </div>
            <div className="catalog-modal-category">
              <AssetCategoryTreeSelect
                label="Loại tài sản"
                required
                value={form.categoryName}
                categoryCode={form.categoryCode}
                onChange={(name, code, id) =>
                  setForm({
                    ...form,
                    categoryId: id ?? null,
                    categoryName: name,
                    categoryCode: code || "",
                    catalogType: catalogTypeForAssetClass(
                      categories.find((category) => category.id === id)?.assetClass,
                    ),
                  })
                }
              />
            </div>
          </div>
        </CrudModal>
      )}
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
  portal = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  portal?: boolean;
}) {
  return (
    <label className="asset-filter-field">
      <span>{label}</span>
      <SearchableSelect
        value={value}
        onChange={onChange}
        portal={portal}
        dropdownClassName={portal ? "catalog-category-filter-dropdown" : ""}
      >
        {children}
      </SearchableSelect>
    </label>
  );
}

function CatalogField({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label>
      <span>
        {label} {required && "*"}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
      />
    </label>
  );
}

function formFromDetail(item: AssetCatalogItemDetail): CatalogFormState {
  return {
    itemCode: item.itemCode,
    name: item.name,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    categoryCode: item.categoryCode,
    catalogType: item.catalogType,
    inventoryGroup: item.inventoryGroup || "",
    unit: normalizeUnit(item.unit),
    costValue: String(item.costValue ?? ""),
    standardValue: String(item.standardValue ?? ""),
    fixedValue: String(item.fixedValue ?? ""),
    internalValue: String(item.internalValue ?? ""),
    technicalSpec: item.technicalSpec || "",
    active: item.active,
  };
}

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function catalogTypeForAssetClass(assetClass?: string): AssetCatalogType {
  return assetClass === "TOOL_EQUIPMENT" ? "TOOL" : "ASSET";
}

function openAssetsForCatalog(item: AssetCatalogItemListItem) {
  const params = new URLSearchParams({
    catalogItemId: String(item.id),
    catalogName: item.name,
  });
  window.history.pushState(null, "", `/assets?${params.toString()}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function emptyToUndefined(value: string): string | undefined {
  return value.trim() || undefined;
}

function numberOrNull(value: string): number | null {
  return value === "" ? null : Number(value);
}

function normalizeUnit(value?: string): CatalogUnit | "" {
  if (!value) return "";
  const code = Object.keys(UNIT_LABELS).find(
    (key) => key === value || UNIT_LABELS[key as CatalogUnit] === value,
  );
  return (code as CatalogUnit | undefined) || "";
}

function unitLabel(value?: string): string {
  const unit = normalizeUnit(value);
  return unit ? UNIT_LABELS[unit] : value || "--";
}
