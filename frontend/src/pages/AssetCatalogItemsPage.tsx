import { type FormEvent, type MouseEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiEdit2, FiPlus, FiRotateCcw, FiSearch, FiSlash, FiX } from "react-icons/fi";
import { CrudModal } from "../components/CrudModal";
import { DataTable } from "../components/DataTable";
import { AssetCategoryTreeSelect } from "../components/forms/AssetCategoryTreeSelect";
import { Field, FormLabel } from "../components/forms/FormFields";
import { RichTextEditor, richTextStorageValue } from "../components/forms/RichTextEditor";
import { SearchableSelect } from "../components/forms/SearchableSelect";
import { OverflowActions } from "../components/OverflowActions";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../contexts/AuthContext";
import { readError } from "../lib/format";
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
type CatalogModalMode = "create" | "view" | "edit";
type CatalogTableColumnId =
  | "name"
  | "code"
  | "categoryName"
  | "categoryCode"
  | "type"
  | "unit"
  | "assetCount"
  | "status";

interface CatalogTableColumnConfig {
  id: CatalogTableColumnId;
  label: string;
  locked?: boolean;
  defaultVisible?: boolean;
}

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

const CATALOG_TABLE_STORAGE_KEY = "qlvt.catalogList.tableColumns.v1";
const CATALOG_TABLE_COLUMNS: CatalogTableColumnConfig[] = [
  { id: "name", label: "Tên danh mục", locked: true, defaultVisible: true },
  { id: "code", label: "Mã danh mục", locked: true, defaultVisible: true },
  { id: "categoryName", label: "Tên loại", locked: true, defaultVisible: true },
  { id: "categoryCode", label: "Mã loại", locked: true, defaultVisible: true },
  { id: "type", label: "Kiểu danh mục", defaultVisible: true },
  { id: "unit", label: "Đơn vị tính", defaultVisible: true },
  { id: "assetCount", label: "Số tài sản", defaultVisible: true },
  { id: "status", label: "Khả dụng", defaultVisible: true },
];
const CATALOG_TABLE_COLUMN_IDS = CATALOG_TABLE_COLUMNS.map((column) => column.id);
const DEFAULT_CATALOG_TABLE_VISIBLE_COLUMNS = CATALOG_TABLE_COLUMNS.filter(
  (column) => column.defaultVisible || column.locked,
).map((column) => column.id);
const CATALOG_TABLE_STRUCTURAL_WIDTH = 118;
const CATALOG_TABLE_SELECTION_WIDTH = 36;
const CATALOG_TABLE_COLUMN_WIDTHS: Record<CatalogTableColumnId, number> = {
  name: 150,
  code: 132,
  categoryName: 140,
  categoryCode: 150,
  type: 126,
  unit: 78,
  assetCount: 74,
  status: 96,
};

function normalizeCatalogColumnOrder(order: CatalogTableColumnId[]) {
  const lockedIds = CATALOG_TABLE_COLUMNS.filter((column) => column.locked).map(
    (column) => column.id,
  );
  const optionalIds = [
    ...order.filter((id) => CATALOG_TABLE_COLUMN_IDS.includes(id) && !lockedIds.includes(id)),
    ...CATALOG_TABLE_COLUMN_IDS.filter((id) => !lockedIds.includes(id) && !order.includes(id)),
  ];
  return [...lockedIds, ...optionalIds];
}

function readCatalogColumnPreferences() {
  const fallback = {
    order: normalizeCatalogColumnOrder(CATALOG_TABLE_COLUMN_IDS),
    visible: DEFAULT_CATALOG_TABLE_VISIBLE_COLUMNS,
  };
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(CATALOG_TABLE_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<{
      order: CatalogTableColumnId[];
      visible: CatalogTableColumnId[];
    }>;
    const knownIds = new Set(CATALOG_TABLE_COLUMN_IDS);
    const order = [
      ...(parsed.order || []).filter((id): id is CatalogTableColumnId => knownIds.has(id)),
      ...CATALOG_TABLE_COLUMN_IDS.filter((id) => !(parsed.order || []).includes(id)),
    ];
    const visible = Array.from(
      new Set([
        ...(parsed.visible || []).filter((id): id is CatalogTableColumnId => knownIds.has(id)),
        ...CATALOG_TABLE_COLUMNS.filter((column) => column.locked).map((column) => column.id),
      ]),
    );
    return { order: normalizeCatalogColumnOrder(order), visible };
  } catch {
    return fallback;
  }
}

export function AssetCatalogItemsPage() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<AssetCatalogItemListItem[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<CatalogModalMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CatalogFormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(() => new Set());
  const [columnConfigOpen, setColumnConfigOpen] = useState(false);
  const [columnOrder, setColumnOrder] = useState<CatalogTableColumnId[]>(
    () => readCatalogColumnPreferences().order,
  );
  const [visibleColumns, setVisibleColumns] = useState<CatalogTableColumnId[]>(
    () => readCatalogColumnPreferences().visible,
  );
  const [draggedColumn, setDraggedColumn] = useState<CatalogTableColumnId | null>(null);

  const canManage = hasPermission("asset_manage");

  useEffect(() => {
    Promise.all([loadAssetCatalogItems(), loadAssetCategories()])
      .then(([catalogItems, assetCategories]) => {
        setItems(catalogItems);
        setCategories(assetCategories);
      })
      .catch((error) =>
        toast.error(readError(error, "Không tải được danh sách danh mục tài sản.")),
      );
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      CATALOG_TABLE_STORAGE_KEY,
      JSON.stringify({ order: columnOrder, visible: visibleColumns }),
    );
  }, [columnOrder, visibleColumns]);

  useEffect(() => {
    setSelectedItemIds((current) => {
      if (current.size === 0) return current;
      const validIds = new Set(items.map((item) => item.id));
      const next = new Set(Array.from(current).filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    const keyword = normalize(query);
    return items.filter((item) => {
      if (categoryFilter !== "ALL" && item.categoryId !== Number(categoryFilter)) return false;
      if (typeFilter !== "ALL" && item.catalogType !== typeFilter) return false;
      if (activeFilter === "ACTIVE" && !item.active) return false;
      if (activeFilter === "INACTIVE" && item.active) return false;
      return (
        !keyword ||
        normalize(
          `${item.itemCode} ${item.name} ${item.categoryName} ${item.categoryCode} ${item.unit || ""}`,
        ).includes(keyword)
      );
    });
  }, [activeFilter, categoryFilter, items, query, typeFilter]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds.has(item.id)),
    [items, selectedItemIds],
  );
  const activeSelectedItems = selectedItems.filter((item) => item.active);

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openDetail = async (id: number) => {
    setBusy(true);
    try {
      const item = await loadAssetCatalogItem(id);
      const itemCategory = categories.find((category) => category.id === item.categoryId);
      const nextForm = formFromDetail(item);
      setEditingId(id);
      setModalMode("view");
      setForm({
        ...nextForm,
        catalogType: itemCategory
          ? catalogTypeForAssetClass(itemCategory.assetClass)
          : nextForm.catalogType,
      });
      setModalOpen(true);
    } catch (error) {
      toast.error(readError(error, "Không tải được chi tiết danh mục."));
    } finally {
      setBusy(false);
    }
  };

  const closeModal = () => {
    if (!busy) setModalOpen(false);
  };

  const startEditingFromDetail = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setModalMode("edit");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (modalMode === "view") return;
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
    } catch (error) {
      toast.error(readError(error, "Không lưu được danh mục."));
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
    } catch (error) {
      toast.error(readError(error, "Không thể cập nhật khả dụng của danh mục."));
    } finally {
      setBusy(false);
    }
  };

  const deactivateSelected = async () => {
    if (activeSelectedItems.length === 0 || busy) return;
    if (
      !window.confirm(
        `Ngừng cho phép gán ${activeSelectedItems.length} danh mục đã chọn cho tài sản mới?`,
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      const results = await Promise.allSettled(
        activeSelectedItems.map((item) => deactivateAssetCatalogItem(item.id)),
      );
      const succeededIds = new Set(
        results
          .map((result, index) =>
            result.status === "fulfilled" ? activeSelectedItems[index].id : 0,
          )
          .filter(Boolean),
      );
      setItems(await loadAssetCatalogItems());
      setSelectedItemIds((current) => {
        const next = new Set(current);
        succeededIds.forEach((id) => {
          next.delete(id);
        });
        return next;
      });
      if (succeededIds.size === activeSelectedItems.length) {
        toast.success(`Đã ngừng cho phép gán ${succeededIds.size} danh mục.`);
      } else {
        toast.error(`Đã cập nhật ${succeededIds.size}/${activeSelectedItems.length} danh mục.`);
      }
    } catch (error) {
      toast.error(readError(error, "Không tải lại được danh sách sau khi cập nhật."));
    } finally {
      setBusy(false);
    }
  };

  const toggleColumn = (id: CatalogTableColumnId) => {
    if (CATALOG_TABLE_COLUMNS.find((column) => column.id === id)?.locked) return;
    setVisibleColumns((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const resetColumns = () => {
    setColumnOrder(normalizeCatalogColumnOrder(CATALOG_TABLE_COLUMN_IDS));
    setVisibleColumns(DEFAULT_CATALOG_TABLE_VISIBLE_COLUMNS);
  };

  const dropColumn = (targetId: CatalogTableColumnId) => {
    if (!draggedColumn || draggedColumn === targetId) return;
    const dragged = CATALOG_TABLE_COLUMNS.find((column) => column.id === draggedColumn);
    const target = CATALOG_TABLE_COLUMNS.find((column) => column.id === targetId);
    if (dragged?.locked || target?.locked) {
      setDraggedColumn(null);
      return;
    }
    setColumnOrder((current) => {
      const withoutDragged = current.filter((id) => id !== draggedColumn);
      const targetIndex = withoutDragged.indexOf(targetId);
      if (targetIndex < 0) return current;
      return normalizeCatalogColumnOrder([
        ...withoutDragged.slice(0, targetIndex),
        draggedColumn,
        ...withoutDragged.slice(targetIndex),
      ]);
    });
    setDraggedColumn(null);
  };

  const catalogColumns = [
    {
      key: "name",
      title: "Tên danh mục",
      className: "catalog-col-name",
      render: (item: AssetCatalogItemListItem) => <CatalogTableText value={item.name} strong />,
    },
    {
      key: "code",
      title: "Mã danh mục",
      className: "catalog-col-code",
      render: (item: AssetCatalogItemListItem) => <CatalogTableText value={item.itemCode} strong />,
    },
    {
      key: "categoryName",
      title: "Tên loại",
      className: "catalog-col-category-name",
      render: (item: AssetCatalogItemListItem) => <CatalogTableText value={item.categoryName} />,
    },
    {
      key: "categoryCode",
      title: "Mã loại",
      className: "catalog-col-category-code",
      render: (item: AssetCatalogItemListItem) => <CatalogTableText value={item.categoryCode} />,
    },
    {
      key: "type",
      title: "Kiểu danh mục",
      className: "catalog-col-type",
      render: (item: AssetCatalogItemListItem) => (
        <CatalogTableText value={TYPE_LABELS[item.catalogType]} />
      ),
    },
    {
      key: "unit",
      title: "Đơn vị tính",
      className: "catalog-col-unit",
      render: (item: AssetCatalogItemListItem) => <CatalogTableText value={unitLabel(item.unit)} />,
    },
    {
      key: "assetCount",
      title: "Số tài sản",
      className: "catalog-col-asset-count",
      render: (item: AssetCatalogItemListItem) => (
        <CatalogTableText value={String(item.assetCount ?? 0)} />
      ),
    },
    {
      key: "status",
      title: "Khả dụng",
      className: "catalog-col-status",
      render: (item: AssetCatalogItemListItem) => {
        const availability = item.active ? "ACTIVE" : "INACTIVE";
        return <StatusBadge value={availability} label={AVAILABILITY_LABELS[availability]} />;
      },
    },
  ];
  const columnById = new Map(catalogColumns.map((column) => [column.key, column]));
  const visibleColumnSet = new Set(visibleColumns);
  const configuredColumns = columnOrder
    .map((id) => columnById.get(id))
    .filter((column): column is (typeof catalogColumns)[number] => {
      if (!column) return false;
      const config = CATALOG_TABLE_COLUMNS.find((item) => item.id === column.key);
      return visibleColumnSet.has(column.key as CatalogTableColumnId) || Boolean(config?.locked);
    });
  const columnConfigOrder = [
    ...columnOrder.filter((id) => CATALOG_TABLE_COLUMNS.find((column) => column.id === id)?.locked),
    ...columnOrder.filter(
      (id) => !CATALOG_TABLE_COLUMNS.find((column) => column.id === id)?.locked,
    ),
  ];
  const tableMinWidth = configuredColumns.reduce(
    (total, column) => total + CATALOG_TABLE_COLUMN_WIDTHS[column.key as CatalogTableColumnId],
    CATALOG_TABLE_STRUCTURAL_WIDTH + (multiSelectMode ? CATALOG_TABLE_SELECTION_WIDTH : 0),
  );

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
            placeholder="Tìm theo tên/mã danh mục, tên/mã tài sản..."
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

      <div
        className={`asset-list-panel catalog-list-panel ${
          columnConfigOpen ? "column-config-open" : ""
        }`}
      >
        <div className="asset-list-head">
          <div className="catalog-list-head-copy">
            <strong>Danh sách danh mục</strong>
            <span>
              {filteredItems.length}/{items.length} danh mục
            </span>
          </div>
          <div className="asset-list-head-actions">
            {canManage && (
              <button
                type="button"
                className="asset-table-text-action asset-multi-select-toggle"
                data-active={multiSelectMode ? "true" : undefined}
                onClick={() => {
                  setMultiSelectMode((enabled) => {
                    if (enabled) setSelectedItemIds(new Set());
                    return !enabled;
                  });
                }}
              >
                {multiSelectMode ? "Tắt chọn nhiều" : "Chọn nhiều"}
              </button>
            )}
            <button
              type="button"
              className="asset-table-text-action asset-column-config-toggle"
              aria-expanded={columnConfigOpen}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setColumnConfigOpen((open) => !open)}
            >
              Cấu hình cột
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
            <div
              className="asset-column-popover catalog-column-popover"
              role="dialog"
              aria-modal="true"
              aria-labelledby="catalog-column-config-title"
            >
              <div className="asset-column-popover-head">
                <div>
                  <strong id="catalog-column-config-title">Cấu hình cột</strong>
                  <span>Bật/tắt và kéo để sắp xếp. Các cột cố định luôn hiển thị.</span>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  title="Đóng"
                  aria-label="Đóng cấu hình cột"
                  onClick={() => setColumnConfigOpen(false)}
                >
                  <FiX />
                </button>
              </div>
              <div className="asset-column-list">
                {columnConfigOrder.map((id) => {
                  const column = CATALOG_TABLE_COLUMNS.find((item) => item.id === id);
                  if (!column) return null;
                  const locked = Boolean(column.locked);
                  const checked = visibleColumnSet.has(id) || locked;
                  return (
                    <label
                      key={id}
                      className={`asset-column-option ${
                        draggedColumn === id ? "is-dragging" : ""
                      } ${locked ? "is-locked" : ""}`}
                      draggable={!locked}
                      onDragStart={() => {
                        if (!locked) setDraggedColumn(id);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => dropColumn(id)}
                      onDragEnd={() => setDraggedColumn(null)}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={locked}
                        onChange={() => toggleColumn(id)}
                      />
                      <span>{column.label}</span>
                      {locked && <em>Bắt buộc</em>}
                    </label>
                  );
                })}
              </div>
              <div className="asset-column-popover-actions">
                <button type="button" className="secondary" onClick={resetColumns}>
                  <FiRotateCcw /> Mặc định
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => setColumnConfigOpen(false)}
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </>
        )}

        {canManage && multiSelectMode && selectedItems.length > 0 && (
          <div
            className="catalog-selection-bar"
            role="region"
            aria-label="Thao tác danh mục đã chọn"
          >
            <strong>{selectedItems.length} danh mục đã chọn</strong>
            <div>
              <button
                type="button"
                className="danger-action"
                disabled={activeSelectedItems.length === 0 || busy}
                onClick={() => void deactivateSelected()}
              >
                <FiSlash /> Ngừng cho phép gán ({activeSelectedItems.length})
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setSelectedItemIds(new Set())}
              >
                <FiX /> Bỏ chọn
              </button>
            </div>
          </div>
        )}

        <DataTable
          data={filteredItems}
          getRowKey={(item) => item.id}
          emptyText={query ? "Không tìm thấy danh mục" : "Chưa có danh mục tài sản"}
          itemLabel="danh mục"
          pageSizeOptions={[20, 50, 100]}
          tableMinWidth={tableMinWidth}
          selection={
            multiSelectMode
              ? {
                  selectedKeys: selectedItemIds,
                  onChange: (keys) => setSelectedItemIds(new Set(Array.from(keys, Number))),
                  getLabel: (item) => item.name,
                }
              : undefined
          }
          columns={[
            ...configuredColumns,
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
                    {
                      label: "Xem chi tiết",
                      onClick: () => void openDetail(item.id),
                    },
                    ...(canManage
                      ? [
                          ...(item.active
                            ? [
                                {
                                  label: "Ngừng cho phép gán",
                                  danger: true,
                                  onClick: () => void deactivate(item),
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

      {modalOpen && (
        <CrudModal
          title={
            modalMode === "view"
              ? "Chi tiết danh mục"
              : modalMode === "edit"
                ? "Cập nhật danh mục"
                : "Thêm danh mục"
          }
          subtitle="Khai báo thông tin dùng chung cho các tài sản cùng danh mục."
          submitting={busy}
          onClose={closeModal}
          onSubmit={submit}
          wide
          className="catalog-modal"
          mode={modalMode}
          footer={
            modalMode === "view" ? (
              <>
                <button className="secondary" type="button" onClick={closeModal}>
                  Đóng
                </button>
                {canManage && (
                  <button className="primary-action" type="button" onClick={startEditingFromDetail}>
                    <FiEdit2 /> Cập nhật
                  </button>
                )}
              </>
            ) : undefined
          }
        >
          <fieldset
            className="catalog-modal-form catalog-modal-layout"
            disabled={modalMode === "view"}
          >
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
                disabled={modalMode === "view"}
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
                disabled={modalMode === "view"}
              />
              <label>
                <FormLabel>Đơn vị tính</FormLabel>
                <SearchableSelect
                  value={form.unit}
                  onChange={(value) => setForm({ ...form, unit: value as CatalogUnit | "" })}
                  disabled={modalMode === "view"}
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
                disabled={modalMode === "view"}
              />
              <Field
                label="Giá tiêu chuẩn"
                type="currency"
                value={form.standardValue}
                onChange={(value) => setForm({ ...form, standardValue: value })}
                disabled={modalMode === "view"}
              />
              <Field
                label="Giá cố định"
                type="currency"
                value={form.fixedValue}
                onChange={(value) => setForm({ ...form, fixedValue: value })}
                disabled={modalMode === "view"}
              />
              <Field
                label="Giá nội bộ"
                type="currency"
                value={form.internalValue}
                onChange={(value) => setForm({ ...form, internalValue: value })}
                disabled={modalMode === "view"}
              />
              <div className="catalog-form-wide">
                <RichTextEditor
                  label="Mô tả kỹ thuật"
                  value={form.technicalSpec}
                  onChange={(value) => setForm({ ...form, technicalSpec: value })}
                  minHeight={150}
                  disabled={modalMode === "view"}
                />
              </div>
              <label className="catalog-active-checkbox catalog-form-wide">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm({ ...form, active: event.target.checked })}
                  disabled={modalMode === "view"}
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
                disabled={modalMode === "view"}
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
          </fieldset>
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

function CatalogTableText({ value, strong = false }: { value: string; strong?: boolean }) {
  const content = strong ? <strong>{value}</strong> : value;
  return (
    <span className="catalog-table-text" title={value}>
      {content}
    </span>
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
