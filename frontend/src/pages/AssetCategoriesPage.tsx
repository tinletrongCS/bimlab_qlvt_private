import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FiDownload,
  FiFileText,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";
import { StatusBadge } from "../components/StatusBadge";
import {
  downloadCategoryImportTemplate,
  emptyCategoryImportResult,
  parseCategoryReferenceSheet,
} from "../lib/categoryExcel";
import {
  commitAssetCategoryImport,
  createAssetCategory,
  deleteAssetCategory,
  loadAssetCategories,
  loadAssetCategoryTree,
  updateAssetCategory,
  validateAssetCategoryImport,
} from "../services/api";
import type {
  AssetCategory,
  AssetCategoryImportRowPayload,
  AssetCategoryImportRowResult,
  AssetCategoryImportValidationResponse,
  AssetCategoryPayload,
  AssetCategoryTree,
} from "../services/types";

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

function importStatusLabel(value: string) {
  if (value === "PENDING") return "Chưa kiểm tra";
  if (value === "VALID") return "Hợp lệ";
  if (value === "INVALID") return "Lỗi";
  if (value === "WARNING") return "Cảnh báo";
  return value;
}

function importActionLabel(value: string) {
  if (value === "PENDING") return "Chưa xác định";
  if (value === "CREATE") return "Thêm mới";
  if (value === "UPDATE") return "Cập nhật";
  if (value === "SKIP") return "Bỏ qua";
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

function treeContainsCategory(node: AssetCategoryTree, id: number): boolean {
  return node.id === id || node.children.some((child) => treeContainsCategory(child, id));
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

function StructureView({
  roots,
  selectedId,
  expandedIds,
  onEdit,
  onToggle,
  searchQuery,
}: {
  roots: AssetCategoryTree[];
  selectedId?: number;
  expandedIds: Set<number>;
  onEdit: (category: AssetCategory) => void;
  onToggle: (id: number) => void;
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

  useEffect(() => {
    if (!selectedId) return;
    const selectedRoot = roots.find((root) => treeContainsCategory(root, selectedId));
    if (selectedRoot && selectedRoot.id !== activeRootId) {
      setActiveRootId(selectedRoot.id);
    }
  }, [activeRootId, roots, selectedId]);

  if (!activeRoot) {
    return <div className="empty-state">Chưa có dữ liệu cơ cấu để hiển thị.</div>;
  }

  return (
    <div className="category-structure-view">
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
                  expandedIds={expandedIds}
                  onToggle={onToggle}
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
  expandedIds,
  onEdit,
  onToggle,
  searchQuery,
}: {
  node: AssetCategoryTree;
  depth: number;
  selectedId?: number;
  expandedIds: Set<number>;
  onEdit: (category: AssetCategory) => void;
  onToggle: (id: number) => void;
  searchQuery: string;
}) {
  const hasChildren = node.children.length > 0;
  const searchActive = normalizeSearchText(searchQuery).length > 0;
  const open = searchActive || expandedIds.has(node.id);

  return (
    <div className="category-structure-row">
      <button
        type="button"
        className="category-structure-row-head"
        data-selected={selectedId === node.id ? "true" : undefined}
        onClick={() => {
          onEdit(node);
          if (hasChildren) onToggle(node.id);
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
                  expandedIds={expandedIds}
                  onToggle={onToggle}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          ) : (
            <p className="category-structure-empty">Chưa có danh mục con</p>
          )}
        </div>
      )}
    </div>
  );
}

type ImportPreviewTreeNode = AssetCategoryImportRowPayload & {
  children: ImportPreviewTreeNode[];
};

function renderImportPreviewTree(
  rows: AssetCategoryImportRowPayload[],
  expandedCodes: Set<string>,
  onToggle: (code: string) => void,
) {
  const byCode = new Map<string, ImportPreviewTreeNode>();
  const roots: ImportPreviewTreeNode[] = [];

  rows.forEach((row) => {
    if (row.code) {
      byCode.set(row.code.trim().toUpperCase(), { ...row, children: [] });
    }
  });

  rows.forEach((row) => {
    if (!row.code) return;
    const node = byCode.get(row.code.trim().toUpperCase());
    if (!node) return;
    if (row.parentCode) {
      const pCode = row.parentCode.trim().toUpperCase();
      const parent = byCode.get(pCode);
      if (parent) {
        parent.children.push(node);
        return;
      }
    }
    roots.push(node);
  });

  const renderNode = (node: ImportPreviewTreeNode, depth = 0) => {
    const code = (node.code ?? "").trim().toUpperCase();
    const hasChildren = node.children.length > 0;
    const open = expandedCodes.has(code);
    return (
      <div key={code} className="category-structure-row">
        <button
          type="button"
          className="category-structure-row-head"
          style={{ paddingLeft: `${depth * 16 + 10}px` }}
          onClick={() => {
            if (hasChildren) onToggle(code);
          }}
        >
          {hasChildren ? (
            <span className={`category-arrow ${open ? "open" : ""}`}>▶</span>
          ) : (
            <span className="category-arrow-spacer" />
          )}
          <span className="category-structure-title" style={{ flex: 1, fontFamily: "inherit" }}>
            {node.name}
          </span>
          <span className="category-structure-count">{node.code}</span>
        </button>
        {hasChildren && open && (
          <div className="category-structure-row-body" style={{ display: "block" }}>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return <>{roots.map((root) => renderNode(root))}</>;
}

export function AssetCategoriesPage() {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [form, setForm] = useState<AssetCategoryPayload>(emptyForm);
  const [editing, setEditing] = useState<AssetCategory | null>(null);
  const [assetClassFilter, setAssetClassFilter] = useState<AssetClassFilter>("ALL");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("ALL");
  const [categorySearch, setCategorySearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [parentFieldsLocked, setParentFieldsLocked] = useState(false);
  const [expandedTreeIds, setExpandedTreeIds] = useState<Set<number>>(new Set());
  const [expandedStructureIds, setExpandedStructureIds] = useState<Set<number>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importRows, setImportRows] = useState<AssetCategoryImportRowPayload[]>([]);
  const [importPreview, setImportPreview] = useState<AssetCategoryImportValidationResponse | null>(
    null,
  );
  const [importCancelConfirm, setImportCancelConfirm] = useState(false);
  const [importPreviewTab, setImportPreviewTab] = useState<"TABLE" | "TREE">("TABLE");
  const [expandedImportTreeCodes, setExpandedImportTreeCodes] = useState<Set<string>>(new Set());
  const [importPreviewFilter, setImportPreviewFilter] = useState<
    "ALL" | "VALID" | "INVALID" | "WARNING"
  >("ALL");

  const selectableParents = useMemo(
    () => categories.filter((item) => item.id !== editing?.id),
    [categories, editing?.id],
  );
  const filteredCategories = useMemo(
    () =>
      categories.filter((category) =>
        matchesCategoryFilters(category, assetClassFilter, activeFilter, categorySearch),
      ),
    [categories, assetClassFilter, activeFilter, categorySearch],
  );
  const filteredTree = useMemo(
    () => filterTree(buildCategoryTree(categories), assetClassFilter, activeFilter, categorySearch),
    [categories, assetClassFilter, activeFilter, categorySearch],
  );
  const categoryFormChanged = useMemo(() => {
    if (!editing) return true;
    return (
      form.code !== editing.code ||
      form.name !== editing.name ||
      form.parentId !== (editing.parentId ?? null) ||
      form.assetClass !== editing.assetClass ||
      (form.description ?? "") !== (editing.description ?? "") ||
      form.active !== editing.active
    );
  }, [editing, form]);

  const importPreviewRows = useMemo(() => {
    if (!importPreview && importRows.length === 0) return [];
    if (!importPreview) return importRows as any[];
    let rows = importPreview.rows;
    if (importPreviewFilter === "VALID") rows = rows.filter((r) => r.status === "VALID");
    else if (importPreviewFilter === "INVALID") rows = rows.filter((r) => r.status === "INVALID");
    else if (importPreviewFilter === "WARNING") rows = rows.filter((r) => r.status === "WARNING");
    return rows;
  }, [importRows, importPreview, importPreviewFilter]);

  const requestCloseImport = () => {
    if (importRows.length > 0) {
      setImportCancelConfirm(true);
    } else {
      closeImport();
    }
  };

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

  const toggleTreeNode = (id: number) => {
    setExpandedTreeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStructureNode = (id: number) => {
    setExpandedStructureIds((prev) => {
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
    setExpandedTreeIds((prev) => new Set(prev).add(parent.id));
    setExpandedStructureIds((prev) => new Set(prev).add(parent.id));
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
    const nextSelectedId = editing?.id ?? form.parentId ?? selectedCategoryId;
    try {
      if (editing) {
        await updateAssetCategory(editing.id, form);
        toast.success("Đã cập nhật danh mục.");
      } else {
        await createAssetCategory(form);
        toast.success("Đã tạo danh mục.");
      }
      setEditing(null);
      setSelectedCategoryId(nextSelectedId ?? null);
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
    if (!window.confirm(`Xóa danh mục ${category.name}?`)) return;
    const nextSelectedId = category.parentId ?? null;
    setSubmitting(true);
    try {
      await deleteAssetCategory(category.id);
      if (editing?.id === category.id) {
        setEditing(null);
        setForm(emptyForm);
        setParentFieldsLocked(false);
      }
      setSelectedCategoryId(nextSelectedId);
      if (nextSelectedId) {
        setExpandedTreeIds((prev) => new Set(prev).add(nextSelectedId));
        setExpandedStructureIds((prev) => new Set(prev).add(nextSelectedId));
      }
      await refresh();
      toast.success("Đã xóa danh mục.");
    } catch {
      toast.error("Không xóa được danh mục.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetImport = () => {
    setImportBusy(false);
    setImportFileName("");
    setImportRows([]);
    setImportPreview(null);
    setImportCancelConfirm(false);
    setImportPreviewTab("TABLE");
    setImportPreviewFilter("ALL");
    setExpandedImportTreeCodes(new Set());
  };

  const closeImport = () => {
    if (importBusy) return;
    setImportOpen(false);
    resetImport();
  };

  const handleImportFile = async (file?: File) => {
    if (!file) return;
    setImportBusy(true);
    try {
      const rows = await parseCategoryReferenceSheet(file);
      setImportFileName(file.name);
      setImportRows(rows);
      setImportPreview(emptyCategoryImportResult(rows));
      setImportPreviewTab("TABLE");
      setExpandedImportTreeCodes(new Set());
      toast.success(`Đã đọc ${rows.length} dòng từ sheet danh mục.`);
    } catch (error) {
      setImportFileName("");
      setImportRows([]);
      setImportPreview(null);
      setExpandedImportTreeCodes(new Set());
      toast.error(error instanceof Error ? error.message : "Không đọc được file Excel.");
    } finally {
      setImportBusy(false);
    }
  };

  const validateImport = async () => {
    if (importRows.length === 0) {
      toast.error("Chọn file Excel trước khi kiểm tra.");
      return;
    }
    setImportBusy(true);
    try {
      const result = await validateAssetCategoryImport(importRows);
      setImportPreview(result);
      if (result.errorRows > 0) toast.error("File danh mục còn lỗi cần sửa.");
      else toast.success("Dữ liệu danh mục hợp lệ.");
    } catch {
      toast.error("Backend validate danh mục đang chờ bạn implement phần TODO.");
    } finally {
      setImportBusy(false);
    }
  };

  const handleDownloadCategoryTemplate = async () => {
    const loadingToast = toast.loading("Đang tạo file mẫu danh mục...");
    try {
      const latestTree = await loadAssetCategoryTree();
      await downloadCategoryImportTemplate(latestTree);
      toast.success("Đã tải file mẫu danh mục.", { id: loadingToast });
    } catch {
      toast.error("Không tạo được file mẫu danh mục.", { id: loadingToast });
    }
  };

  const commitImport = async () => {
    if (!importPreview || importPreview.errorRows > 0 || importRows.length === 0) return;
    setImportBusy(true);
    try {
      const result = await commitAssetCategoryImport({ rows: importRows });
      toast.success(`Đã nhập ${result.importedRows} dòng, cập nhật ${result.updatedRows} dòng.`);
      setImportPreview({
        uploadStatus: result.uploadStatus,
        totalRows: result.rows.length,
        validRows: result.importedRows + result.updatedRows,
        errorRows: result.errorRows,
        warningRows: 0,
        rows: result.rows,
      });
      await refresh();
    } catch {
      toast.error("Backend lưu danh mục đang chờ bạn implement phần TODO.");
    } finally {
      setImportBusy(false);
    }
  };

  const toggleImportTreeNode = (code: string) => {
    setExpandedImportTreeCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const renderImportNotes = (row: AssetCategoryImportRowResult) => {
    const notes = [...row.errors, ...row.warnings].map((item) => item.message);
    if (notes.length === 0) return "—";
    return notes.map((note) => `- ${note}`).join("\n");
  };

  return (
    <section className="category-page">
      <div className="panel">
        <header className="asset-page-header">
          <div>
            <h2>Danh mục tài sản</h2>
          </div>
        </header>
        <div className="asset-page-actions category-page-actions">
          <button
            type="button"
            className="asset-template-button"
            onClick={() => void handleDownloadCategoryTemplate()}
          >
            <FiDownload /> Tải danh mục
          </button>
          <button
            type="button"
            className="asset-import-button"
            onClick={() => {
              resetImport();
              setImportOpen(true);
            }}
          >
            <FiUpload /> Import danh mục
          </button>
        </div>

        <div className="category-workspace">
          <div className="category-main-column">
            <div className="category-tree-panel">
              <div className="category-panel-controls">
                <div className="category-section-heading">
                  <h3>Sơ đồ phân cấp</h3>
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
                <label className="category-search-field">
                  Tìm danh mục
                  <span>
                    <FiSearch />
                    <input
                      value={categorySearch}
                      onChange={(event) => setCategorySearch(event.target.value)}
                      placeholder="Tìm theo tên, mã, mô tả..."
                    />
                    {categorySearch && (
                      <button
                        type="button"
                        className="category-search-clear"
                        onClick={() => setCategorySearch("")}
                        aria-label="Xóa nội dung tìm kiếm"
                      >
                        <FiX />
                      </button>
                    )}
                  </span>
                </label>
                <label>
                  Loại danh mục
                  <select
                    value={assetClassFilter}
                    onChange={(event) =>
                      setAssetClassFilter(event.target.value as AssetClassFilter)
                    }
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
              ) : (
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
                        searchQuery={categorySearch}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!loading && filteredCategories.length > 0 && (
              <div className="category-tree-panel category-management-section">
                <div className="category-section-heading">
                  <h3>Quản lý danh sách</h3>
                </div>
                <StructureView
                  roots={filteredTree}
                  selectedId={selectedCategoryId ?? undefined}
                  onEdit={startEdit}
                  expandedIds={expandedStructureIds}
                  onToggle={toggleStructureNode}
                  searchQuery={categorySearch}
                />
              </div>
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

            <div className="category-editor-actions">
              {editing && (
                <>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => startCreateChild(editing)}
                    disabled={submitting}
                  >
                    <FiPlus /> Thêm con
                  </button>
                  <button
                    type="button"
                    className="danger-action"
                    onClick={() => void remove(editing)}
                    disabled={submitting}
                  >
                    <FiTrash2 /> Xóa
                  </button>
                </>
              )}
              <button
                type="submit"
                disabled={submitting || (editing ? !categoryFormChanged : false)}
              >
                <FiSave /> {editing ? "Lưu" : "Tạo danh mục"}
              </button>
            </div>
          </form>
        </div>

        {importOpen && (
          <div className="modal-backdrop">
            <div className="crud-modal asset-import-modal">
              <div className="modal-head">
                <div className="modal-title-group">
                  <span className="modal-title-icon create">
                    <FiFileText />
                  </span>
                  <div>
                    <h2>Tải danh mục tài sản</h2>
                  </div>
                </div>
                <button type="button" className="icon-button" onClick={requestCloseImport}>
                  <FiX />
                </button>
              </div>

              <div className="asset-import-body">
                <div className="asset-import-file-row">
                  <label className="asset-import-file-button">
                    <FiUpload /> Chọn file Excel
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(event) => void handleImportFile(event.target.files?.[0])}
                      disabled={importBusy}
                    />
                  </label>
                  <div className="asset-import-file-meta">
                    <strong>{importFileName || "Chưa chọn file Excel"}</strong>
                    <small>Dùng sheet DanhMuc_ThamChieu giống file mẫu import tài sản.</small>
                  </div>
                </div>

                <div className="asset-import-summary">
                  <div>
                    <span>Dòng đã đọc</span>
                    <strong>{importRows.length}</strong>
                  </div>
                  <div>
                    <span>Hợp lệ</span>
                    <strong>{importPreview?.validRows ?? "—"}</strong>
                  </div>
                  <div>
                    <span>Lỗi</span>
                    <strong>{importPreview?.errorRows ?? "—"}</strong>
                  </div>
                  <div>
                    <span>Cảnh báo</span>
                    <strong>{importPreview?.warningRows ?? "—"}</strong>
                  </div>
                </div>

                <div className="asset-import-controls">
                  <div className="asset-import-options">
                    {importPreview?.uploadStatus === "VALID" && (
                      <div className="asset-import-tabs" style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          style={{
                            padding: "4px 12px",
                            fontSize: "11px",
                            fontFamily: "inherit",
                            background: importPreviewTab === "TABLE" ? "#e0f2fe" : "transparent",
                            border: "none",
                            color: importPreviewTab === "TABLE" ? "#0369a1" : "#6b7280",
                            borderRadius: "4px",
                            fontWeight: importPreviewTab === "TABLE" ? 500 : 400,
                            cursor: "pointer",
                          }}
                          onClick={() => setImportPreviewTab("TABLE")}
                        >
                          Danh sách dòng
                        </button>
                        <button
                          type="button"
                          style={{
                            padding: "4px 12px",
                            fontSize: "11px",
                            fontFamily: "inherit",
                            background: importPreviewTab === "TREE" ? "#e0f2fe" : "transparent",
                            border: "none",
                            color: importPreviewTab === "TREE" ? "#0369a1" : "#6b7280",
                            borderRadius: "4px",
                            fontWeight: importPreviewTab === "TREE" ? 500 : 400,
                            cursor: "pointer",
                          }}
                          onClick={() => setImportPreviewTab("TREE")}
                        >
                          Phân cấp cha con
                        </button>
                      </div>
                    )}
                  </div>

                  <div
                    className="asset-import-preview-toolbar"
                    data-hidden={importPreviewTab === "TABLE" ? undefined : "true"}
                  >
                    <span>Trạng thái dòng</span>
                    <div>
                      <button
                        type="button"
                        data-active={importPreviewFilter === "ALL" ? "true" : undefined}
                        onClick={() => setImportPreviewFilter("ALL")}
                      >
                        Tất cả <strong>{importPreview?.totalRows ?? importRows.length}</strong>
                      </button>
                      <button
                        type="button"
                        data-active={importPreviewFilter === "VALID" ? "true" : undefined}
                        disabled={!importPreview}
                        onClick={() => setImportPreviewFilter("VALID")}
                      >
                        Hợp lệ <strong>{importPreview?.validRows ?? 0}</strong>
                      </button>
                      <button
                        type="button"
                        data-active={importPreviewFilter === "INVALID" ? "true" : undefined}
                        disabled={!importPreview}
                        onClick={() => setImportPreviewFilter("INVALID")}
                      >
                        Lỗi <strong>{importPreview?.errorRows ?? 0}</strong>
                      </button>
                      <button
                        type="button"
                        data-active={importPreviewFilter === "WARNING" ? "true" : undefined}
                        disabled={!importPreview}
                        onClick={() => setImportPreviewFilter("WARNING")}
                      >
                        Cảnh báo <strong>{importPreview?.warningRows ?? 0}</strong>
                      </button>
                    </div>
                  </div>

                  <div className="asset-import-preview">
                    {importPreviewTab === "TREE" ? (
                      <div className="category-structure-rows" style={{ padding: "12px" }}>
                        {renderImportPreviewTree(
                          importRows,
                          expandedImportTreeCodes,
                          toggleImportTreeNode,
                        )}
                      </div>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Dòng</th>
                            <th>Nhóm</th>
                            <th>Mã</th>
                            <th>Tên danh mục</th>
                            <th>Danh mục cha</th>
                            <th>Thao tác</th>
                            <th>Trạng thái</th>
                            <th>Ghi chú kiểm tra</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importRows.length === 0 || importPreviewRows.length === 0 ? (
                            <tr className="asset-table-empty-row">
                              <td colSpan={8}>
                                <div className="asset-table-empty-state">
                                  {importRows.length === 0
                                    ? "Chọn file Excel để xem dữ liệu trước khi import."
                                    : "Không có dòng phù hợp bộ lọc."}
                                </div>
                              </td>
                            </tr>
                          ) : (
                            importPreviewRows.map((row) => {
                              const isResultRow = "status" in row;
                              const source =
                                importRows.find((item) => item.rowNumber === row.rowNumber) ||
                                (row as any);
                              const status = isResultRow ? row.status : undefined;
                              return (
                                <tr key={row.rowNumber} data-status={status}>
                                  <td>{row.rowNumber}</td>
                                  <td>{source?.group || "—"}</td>
                                  <td>{row.code || source?.code || "—"}</td>
                                  <td>{row.name || source?.name || "—"}</td>
                                  <td>{row.parentCode || source?.parentCode || "—"}</td>
                                  <td>{isResultRow ? importActionLabel(row.action) : "—"}</td>
                                  <td>
                                    {status ? (
                                      <StatusBadge
                                        value={status}
                                        label={importStatusLabel(status)}
                                      />
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                  <td className="asset-import-message-cell">
                                    {isResultRow ? (
                                      <span
                                        className="asset-import-note"
                                        title={renderImportNotes(row)}
                                      >
                                        {renderImportNotes(row)}
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-actions asset-import-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={requestCloseImport}
                  disabled={importBusy}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void validateImport()}
                  disabled={importBusy || importRows.length === 0}
                >
                  Kiểm tra dữ liệu
                </button>
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => void commitImport()}
                  disabled={
                    importBusy ||
                    importRows.length === 0 ||
                    !importPreview ||
                    importPreview.uploadStatus === "PENDING" ||
                    importPreview.errorRows > 0
                  }
                >
                  Xác nhận nhập
                </button>
              </div>

              {importCancelConfirm && (
                <div className="asset-import-confirm">
                  <div className="asset-import-confirm-card">
                    <div className="asset-import-confirm-icon">
                      <FiX />
                    </div>
                    <div className="asset-import-confirm-content">
                      <strong>Hủy phiên nhập danh mục?</strong>
                      <p>
                        File đã chọn, dữ liệu preview và kết quả kiểm tra hiện tại sẽ bị xóa khỏi
                        màn hình.
                      </p>
                    </div>
                    <div className="asset-import-confirm-actions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setImportCancelConfirm(false)}
                      >
                        Tiếp tục nhập
                      </button>
                      <button type="button" className="danger-action" onClick={closeImport}>
                        Hủy phiên nhập
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
