import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiPlus, FiRefreshCw, FiSave, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import { PanelHeader } from "../components/PanelHeader";
import {
  createAssetCategory,
  deleteAssetCategory,
  loadAssetCategories,
  updateAssetCategory,
} from "../services/api";
import type { AssetCategory, AssetCategoryPayload, AssetCategoryTree } from "../services/types";

type CategoryViewMode = "TREE" | "STRUCTURE";
type AssetClassFilter = "ALL" | "FIXED_ASSET" | "TOOL_EQUIPMENT";
type ActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";

const emptyForm: AssetCategoryPayload = {
  code: "",
  name: "",
  parentId: null,
  assetClass: "FIXED_ASSET",
  description: "",
  active: true,
};

function assetClassLabel(value: string) {
  if (value === "FIXED_ASSET") return "Tài sản cố định";
  if (value === "TOOL_EQUIPMENT") return "Công cụ dụng cụ";
  return value;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function highlightCategoryText(text: string, query: string): ReactNode {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return text;

  let normalizedText = "";
  const positions: Array<{ start: number; end: number }> = [];
  let offset = 0;
  Array.from(text).forEach((char) => {
    const charStart = offset;
    offset += char.length;
    const normalizedChar = normalizeSearchText(char);
    normalizedText += normalizedChar;
    Array.from(normalizedChar).forEach(() => {
      positions.push({ start: charStart, end: charStart + char.length });
    });
  });

  const index = normalizedText.indexOf(normalizedQuery);
  if (index < 0) return text;
  const start = positions[index]?.start;
  const end = positions[index + normalizedQuery.length - 1]?.end;
  if (start === undefined || end === undefined) return text;
  return (
    <>
      {text.slice(0, start)}
      <mark className="category-search-mark">{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}

function matchesCategoryFilters(
  category: AssetCategory,
  assetClassFilter: AssetClassFilter,
  activeFilter: ActiveFilter,
  searchQuery: string,
) {
  const matchClass = assetClassFilter === "ALL" || category.assetClass === assetClassFilter;
  const matchActive =
    activeFilter === "ALL" ||
    (activeFilter === "ACTIVE" && category.active) ||
    (activeFilter === "INACTIVE" && !category.active);
  const normalizedQuery = normalizeSearchText(searchQuery);
  const matchSearch =
    !normalizedQuery ||
    normalizeSearchText(`${category.name} ${category.code} ${category.description ?? ""}`).includes(
      normalizedQuery,
    );

  return matchClass && matchActive && matchSearch;
}

function filterTree(
  nodes: AssetCategoryTree[],
  assetClassFilter: AssetClassFilter,
  activeFilter: ActiveFilter,
  searchQuery: string,
): AssetCategoryTree[] {
  return nodes
    .map((node) => {
      const children = filterTree(node.children, assetClassFilter, activeFilter, searchQuery);
      const selfMatches = matchesCategoryFilters(node, assetClassFilter, activeFilter, searchQuery);
      return selfMatches || children.length > 0 ? { ...node, children } : null;
    })
    .filter((node): node is AssetCategoryTree => node !== null);
}

function buildCategoryTree(categories: AssetCategory[]): AssetCategoryTree[] {
  const byId = new Map<number, AssetCategoryTree>();

  categories.forEach((category) => {
    byId.set(category.id, { ...category, children: [] });
  });

  const roots: AssetCategoryTree[] = [];
  categories.forEach((category) => {
    const node = byId.get(category.id);
    if (!node) return;
    const parent = category.parentId ? byId.get(category.parentId) : null;
    if (parent && parent.id !== category.id) parent.children.push(node);
    else roots.push(node);
  });

  const sortRec = (nodes: AssetCategoryTree[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    nodes.forEach((node) => {
      sortRec(node.children);
    });
  };
  sortRec(roots);
  return roots;
}

function countTree(nodes: AssetCategoryTree[]): number {
  return nodes.reduce((total, node) => total + 1 + countTree(node.children), 0);
}

function CategoryNode({
  node,
  depth = 0,
  expandedIds,
  selectedId,
  onToggle,
  onEdit,
  onDelete,
  onCreateChild,
  searchQuery,
}: {
  node: AssetCategoryTree;
  depth?: number;
  expandedIds: Set<number>;
  selectedId?: number;
  onToggle: (id: number) => void;
  onEdit: (category: AssetCategory) => void;
  onDelete: (category: AssetCategory) => void;
  onCreateChild: (category: AssetCategory) => void;
  searchQuery: string;
}) {
  const open = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div className="category-branch">
      <div
        className="category-org-card"
        data-selected={selectedId === node.id ? "true" : undefined}
        onClick={() => {
          onEdit(node);
          if (hasChildren) onToggle(node.id);
        }}
        title={hasChildren ? (open ? "Thu gọn" : "Mở rộng") : node.name}
      >
        <span className={`category-status-dot ${node.active ? "active" : "inactive"}`} />
        <div className="category-card-copy">
          <strong title={node.name}>{highlightCategoryText(node.name, searchQuery)}</strong>
          <span title={node.code}>{highlightCategoryText(node.code, searchQuery)}</span>
        </div>

        <div className="category-card-actions">
          {hasChildren && (
            <button
              type="button"
              className="category-expand-button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(node);
                onToggle(node.id);
              }}
              title={open ? "Thu gọn" : "Mở rộng"}
            >
              {open ? "−" : `+${node.children.length}`}
            </button>
          )}
          <button
            type="button"
            className="category-icon-action"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(node);
              onCreateChild(node);
            }}
            title="Thêm danh mục con"
          >
            <FiPlus />
          </button>
          <button
            type="button"
            className="category-icon-action danger"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(node);
              onDelete(node);
            }}
            title="Xóa"
          >
            <FiTrash2 />
          </button>
        </div>
      </div>

      {hasChildren && open && (
        <div className="category-children">
          <div className="category-down-line" />
          <div className="category-child-row">
            {node.children.map((child, index) => (
              <div className="category-child-slot" key={child.id}>
                <div className="category-connector-cap">
                  {node.children.length > 1 && index > 0 && <span className="left" />}
                  {node.children.length > 1 && index < node.children.length - 1 && (
                    <span className="right" />
                  )}
                  <span className="down" />
                </div>
                <CategoryNode
                  node={child}
                  depth={depth + 1}
                  expandedIds={expandedIds}
                  selectedId={selectedId}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onCreateChild={onCreateChild}
                  searchQuery={searchQuery}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`category-summary-stat ${accent ? "accent" : ""}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function StructureView({
  roots,
  selectedId,
  onEdit,
  onDelete,
  onCreateChild,
  searchQuery,
}: {
  roots: AssetCategoryTree[];
  selectedId?: number;
  onEdit: (category: AssetCategory) => void;
  onDelete: (category: AssetCategory) => void;
  onCreateChild: (category: AssetCategory) => void;
  searchQuery: string;
}) {
  const [activeRootId, setActiveRootId] = useState<number | null>(null);
  const activeRoot = roots.find((root) => root.id === activeRootId) ?? roots[0] ?? null;

  useEffect(() => {
    if (roots.length === 0) {
      setActiveRootId(null);
      return;
    }
    if (!activeRoot || !roots.some((root) => root.id === activeRoot.id)) {
      setActiveRootId(roots[0].id);
    }
  }, [activeRoot, roots]);

  if (!activeRoot) {
    return <div className="empty-state">Chưa có dữ liệu cơ cấu để hiển thị.</div>;
  }

  const totalRoots = roots.length;
  const totalChildren = roots.reduce((total, root) => total + root.children.length, 0);
  const totalCategories = countTree(roots);

  return (
    <div className="category-structure-view">
      <div className="category-summary-grid">
        <SummaryStat label="Danh mục gốc" value={totalRoots} />
        <SummaryStat label="Nhóm con trực tiếp" value={totalChildren} />
        <SummaryStat label="Tổng danh mục" value={totalCategories} accent />
      </div>

      <div className="category-structure-grid">
        <aside className="category-structure-sidebar">
          <div className="category-structure-sidebar-head">
            <p>Danh mục gốc</p>
            <span>{roots.length} nhóm · click để xem</span>
          </div>
          <nav>
            {roots.map((root) => {
              const active = root.id === activeRoot.id;
              return (
                <button
                  type="button"
                  key={root.id}
                  className={active ? "active" : ""}
                  onClick={() => {
                    setActiveRootId(root.id);
                    onEdit(root);
                  }}
                >
                  <span
                    className={`category-status-dot inline ${root.active ? "active" : "inactive"}`}
                  />
                  <strong title={root.name}>{highlightCategoryText(root.name, searchQuery)}</strong>
                  <small>{countTree(root.children)}</small>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="category-structure-detail">
          <div className="category-structure-detail-head">
            <div>
              <p>Danh mục cha</p>
              <h3 title={activeRoot.name}>{activeRoot.name}</h3>
              <span>
                {assetClassLabel(activeRoot.assetClass)} · {activeRoot.children.length} nhóm con
              </span>
            </div>
            <strong>{countTree(activeRoot.children)}</strong>
          </div>
          <div className="category-structure-rows">
            {activeRoot.children.length === 0 ? (
              <p className="category-structure-empty">Danh mục này chưa có nhóm con.</p>
            ) : (
              activeRoot.children.map((node) => (
                <StructureRow
                  key={node.id}
                  node={node}
                  depth={1}
                  selectedId={selectedId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onCreateChild={onCreateChild}
                  searchQuery={searchQuery}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StructureRow({
  node,
  depth,
  selectedId,
  onEdit,
  onDelete,
  onCreateChild,
  searchQuery,
}: {
  node: AssetCategoryTree;
  depth: number;
  selectedId?: number;
  onEdit: (category: AssetCategory) => void;
  onDelete: (category: AssetCategory) => void;
  onCreateChild: (category: AssetCategory) => void;
  searchQuery: string;
}) {
  const [manualOpen, setManualOpen] = useState(false);
  const hasChildren = node.children.length > 0;
  const searchActive = normalizeSearchText(searchQuery).length > 0;
  const open = searchActive || manualOpen;

  return (
    <div className="category-structure-row">
      <button
        type="button"
        className="category-structure-row-head"
        data-selected={selectedId === node.id ? "true" : undefined}
        onClick={() => {
          onEdit(node);
          if (hasChildren) setManualOpen((value) => !value);
        }}
      >
        {hasChildren ? (
          <span className={`category-arrow ${open ? "open" : ""}`}>▶</span>
        ) : (
          <span className="category-arrow-spacer" />
        )}
        <span className="category-structure-title" title={node.name}>
          {highlightCategoryText(node.name, searchQuery)}
        </span>
        <span className="category-structure-count">{node.children.length} nhóm con</span>
        <span
          role="button"
          tabIndex={0}
          className="category-structure-add"
          title="Thêm danh mục con"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(node);
            onCreateChild(node);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            onEdit(node);
            onCreateChild(node);
          }}
        >
          <FiPlus />
        </span>
        <span
          role="button"
          tabIndex={0}
          className="category-structure-delete"
          title="Xóa"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(node);
            onDelete(node);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            onEdit(node);
            onDelete(node);
          }}
        >
          <FiTrash2 />
        </span>
      </button>

      {open && (
        <div className="category-structure-row-body">
          {hasChildren ? (
            <div className="category-structure-children">
              {node.children.map((child) => (
                <StructureRow
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  selectedId={selectedId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onCreateChild={onCreateChild}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          ) : (
            <p>Chưa có danh mục con</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AssetCategoriesPage() {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [form, setForm] = useState<AssetCategoryPayload>(emptyForm);
  const [editing, setEditing] = useState<AssetCategory | null>(null);
  const [viewMode, setViewMode] = useState<CategoryViewMode>("TREE");
  const [assetClassFilter, setAssetClassFilter] = useState<AssetClassFilter>("ALL");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");
  const [categorySearch, setCategorySearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [parentFieldsLocked, setParentFieldsLocked] = useState(false);
  const [expandedTreeIds, setExpandedTreeIds] = useState<Set<number>>(new Set());
  const effectiveSearch = viewMode === "STRUCTURE" ? categorySearch : "";

  const selectableParents = useMemo(
    () => categories.filter((item) => item.id !== editing?.id),
    [categories, editing?.id],
  );
  const filteredCategories = useMemo(
    () =>
      categories.filter((category) =>
        matchesCategoryFilters(category, assetClassFilter, activeFilter, effectiveSearch),
      ),
    [categories, assetClassFilter, activeFilter, effectiveSearch],
  );
  const filteredTree = useMemo(
    () =>
      filterTree(buildCategoryTree(categories), assetClassFilter, activeFilter, effectiveSearch),
    [categories, assetClassFilter, activeFilter, effectiveSearch],
  );
  const refresh = async () => {
    setLoading(true);
    try {
      const categoryData = await loadAssetCategories();
      setCategories(categoryData);
    } catch {
      toast.error("Không tải được danh mục tài sản.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setSelectedCategoryId(null);
    setParentFieldsLocked(false);
    setForm(emptyForm);
  };

  const resetEditor = () => {
    setEditing(null);
    setSelectedCategoryId(null);
    setParentFieldsLocked(false);
    setForm(emptyForm);
  };

  const changeViewMode = (nextMode: CategoryViewMode) => {
    setViewMode(nextMode);
    resetEditor();
  };

  const toggleTreeNode = (id: number) => {
    setExpandedTreeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startCreateChild = (parent: AssetCategory) => {
    setEditing(null);
    setSelectedCategoryId(parent.id);
    setParentFieldsLocked(true);
    setForm({
      ...emptyForm,
      parentId: parent.id,
      assetClass: parent.assetClass,
      active: parent.active,
    });
  };

  const startEdit = (category: AssetCategory) => {
    setEditing(category);
    setSelectedCategoryId(category.id);
    setParentFieldsLocked(false);
    setForm({
      code: category.code,
      name: category.name,
      parentId: category.parentId ?? null,
      assetClass: category.assetClass,
      description: category.description ?? "",
      active: category.active,
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await updateAssetCategory(editing.id, form);
        toast.success("Đã cập nhật danh mục.");
      } else {
        await createAssetCategory(form);
        toast.success("Đã tạo danh mục.");
      }
      setEditing(null);
      setSelectedCategoryId(null);
      setForm(emptyForm);
      setParentFieldsLocked(false);
      await refresh();
    } catch {
      toast.error("Không lưu được danh mục.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (category: AssetCategory) => {
    setSelectedCategoryId(category.id);
    if (!window.confirm(`Xóa danh mục ${category.name}?`)) return;
    setSubmitting(true);
    try {
      await deleteAssetCategory(category.id);
      if (editing?.id === category.id) {
        setEditing(null);
        setSelectedCategoryId(null);
        setForm(emptyForm);
        setParentFieldsLocked(false);
      }
      await refresh();
      toast.success("Đã xóa danh mục.");
    } catch {
      toast.error("Không xóa được danh mục.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="category-page">
      <div className="panel">
        <PanelHeader title="Danh mục tài sản" action={false} onAdd={startCreate} />

        <div className="category-workspace">
          <div className="category-tree-panel">
            <div className="category-panel-controls">
              <div className="category-view-tabs">
                <button
                  type="button"
                  className={viewMode === "TREE" ? "active" : ""}
                  onClick={() => changeViewMode("TREE")}
                >
                  Sơ đồ phân cấp
                </button>
                <button
                  type="button"
                  className={viewMode === "STRUCTURE" ? "active" : ""}
                  onClick={() => changeViewMode("STRUCTURE")}
                >
                  Quản lý danh sách
                </button>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => void refresh()}
                disabled={loading || submitting}
              >
                <FiRefreshCw /> Làm mới
              </button>
            </div>

            <div className="category-filters">
              {viewMode === "STRUCTURE" && (
                <label className="category-search-field">
                  Tìm danh mục
                  <span>
                    <FiSearch />
                    <input
                      value={categorySearch}
                      onChange={(event) => setCategorySearch(event.target.value)}
                      placeholder="Tìm theo tên, mã, mô tả..."
                    />
                  </span>
                </label>
              )}
              <label>
                Loại danh mục
                <select
                  value={assetClassFilter}
                  onChange={(event) => setAssetClassFilter(event.target.value as AssetClassFilter)}
                >
                  <option value="ALL">Tất cả</option>
                  <option value="FIXED_ASSET">Tài sản cố định</option>
                  <option value="TOOL_EQUIPMENT">Công cụ dụng cụ</option>
                </select>
              </label>
              <label>
                Trạng thái
                <select
                  value={activeFilter}
                  onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)}
                >
                  <option value="ALL">Tất cả</option>
                  <option value="ACTIVE">Đang sử dụng</option>
                  <option value="INACTIVE">Ngưng sử dụng</option>
                </select>
              </label>
            </div>

            {loading ? (
              <div className="loading">Đang tải dữ liệu...</div>
            ) : filteredCategories.length === 0 ? (
              <div className="empty-state">Chưa có danh mục.</div>
            ) : viewMode === "TREE" ? (
              <div className="category-org-viewport">
                <div className="category-org-forest">
                  {filteredTree.map((node) => (
                    <CategoryNode
                      key={node.id}
                      node={node}
                      expandedIds={expandedTreeIds}
                      selectedId={selectedCategoryId ?? undefined}
                      onToggle={toggleTreeNode}
                      onEdit={startEdit}
                      onDelete={remove}
                      onCreateChild={startCreateChild}
                      searchQuery={effectiveSearch}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <StructureView
                roots={filteredTree}
                selectedId={selectedCategoryId ?? undefined}
                onEdit={startEdit}
                onDelete={remove}
                onCreateChild={startCreateChild}
                searchQuery={effectiveSearch}
              />
            )}
          </div>

          <form className="category-editor" onSubmit={submit}>
            <div className="category-editor-heading">
              <h3>{editing ? "Cập nhật danh mục" : "Thêm danh mục"}</h3>
              {editing && (
                <button type="button" className="ghost-button" onClick={startCreate}>
                  <FiX /> Hủy
                </button>
              )}
            </div>

            {!editing && form.parentId && (
              <div className="category-parent-context">
                <span>Tạo danh mục con của</span>
                <strong>
                  {categories.find((category) => category.id === form.parentId)?.name}
                </strong>
              </div>
            )}

            <label>
              Tên danh mục
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
                maxLength={180}
              />
            </label>

            <label>
              Mã danh mục
              <input
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                required
                maxLength={60}
              />
            </label>

            <label>
              Nhóm cha
              <select
                disabled={parentFieldsLocked}
                value={form.parentId ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    parentId: event.target.value ? Number(event.target.value) : null,
                  }))
                }
              >
                <option value="">Không có</option>
                {selectableParents.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Loại tài sản
              <select
                disabled={parentFieldsLocked}
                value={form.assetClass}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, assetClass: event.target.value }))
                }
              >
                <option value="FIXED_ASSET">Tài sản cố định</option>
                <option value="TOOL_EQUIPMENT">Công cụ dụng cụ</option>
              </select>
            </label>

            <label>
              Mô tả
              <textarea
                value={form.description ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={4}
                maxLength={500}
              />
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
              />
              Đang sử dụng
            </label>

            <button type="submit" disabled={submitting}>
              <FiSave /> {editing ? "Lưu thay đổi" : "Tạo danh mục"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
