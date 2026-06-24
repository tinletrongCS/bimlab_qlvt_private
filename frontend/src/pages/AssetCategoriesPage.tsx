import { type FormEvent, useEffect, useMemo, useState } from "react";
import { FiGitBranch, FiRefreshCw, FiSave, FiX } from "react-icons/fi";
import { PanelHeader } from "../components/PanelHeader";
import { RowActions } from "../components/RowActions";
import { StatusBadge } from "../components/StatusBadge";
import {
  createAssetCategory,
  deleteAssetCategory,
  loadAssetCategories,
  loadAssetCategoryTree,
  updateAssetCategory,
} from "../services/api";
import type { AssetCategory, AssetCategoryPayload, AssetCategoryTree } from "../services/types";

const emptyForm: AssetCategoryPayload = {
  code: "",
  name: "",
  parentId: null,
  assetClass: "FIXED_ASSET",
  description: "",
  active: true,
};

function CategoryNode({
  node,
  onEdit,
  onDelete,
}: {
  node: AssetCategoryTree;
  onEdit: (category: AssetCategory) => void;
  onDelete: (category: AssetCategory) => void;
}) {
  return (
    <li>
      <div className="category-node">
        <div>
          <strong>{node.name}</strong>
          <span>{node.code}</span>
        </div>
        <div className="category-node-meta">
          <StatusBadge value={node.active ? "ACTIVE" : "INACTIVE"} />
          <small>{node.assetClass === "FIXED_ASSET" ? "TSCĐ" : "CCDC"}</small>
        </div>
        <RowActions onEdit={() => onEdit(node)} onDelete={() => onDelete(node)} />
      </div>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function AssetCategoriesPage() {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [tree, setTree] = useState<AssetCategoryTree[]>([]);
  const [form, setForm] = useState<AssetCategoryPayload>(emptyForm);
  const [editing, setEditing] = useState<AssetCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectableParents = useMemo(
    () => categories.filter((item) => item.id !== editing?.id),
    [categories, editing?.id],
  );

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [categoryData, treeData] = await Promise.all([
        loadAssetCategories(),
        loadAssetCategoryTree(),
      ]);
      setCategories(categoryData);
      setTree(treeData);
    } catch {
      setError("Không tải được danh mục tài sản.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const startEdit = (category: AssetCategory) => {
    setEditing(category);
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
    setError(null);
    try {
      if (editing) {
        await updateAssetCategory(editing.id, form);
      } else {
        await createAssetCategory(form);
      }
      setEditing(null);
      setForm(emptyForm);
      await refresh();
    } catch {
      setError("Không lưu được danh mục.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (category: AssetCategory) => {
    if (!window.confirm(`Xóa danh mục ${category.name}?`)) return;
    setSubmitting(true);
    setError(null);
    try {
      await deleteAssetCategory(category.id);
      if (editing?.id === category.id) {
        setEditing(null);
        setForm(emptyForm);
      }
      await refresh();
    } catch {
      setError("Không xóa được danh mục.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="category-page">
      <div className="panel">
        <PanelHeader title="Danh mục tài sản" action onAdd={startCreate} />
        {error && <div className="alert">{error}</div>}

        <div className="category-workspace">
          <div className="category-tree-panel">
            <div className="category-toolbar">
              <div>
                <FiGitBranch />
                <strong>Cây phân cấp</strong>
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

            {loading ? (
              <div className="loading">Đang tải dữ liệu...</div>
            ) : tree.length === 0 ? (
              <div className="empty-state">Chưa có danh mục.</div>
            ) : (
              <div className="category-tree">
                <ul>
                  {tree.map((node) => (
                    <CategoryNode key={node.id} node={node} onEdit={startEdit} onDelete={remove} />
                  ))}
                </ul>
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
              Tên danh mục
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
                maxLength={180}
              />
            </label>

            <label>
              Nhóm cha
              <select
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
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, active: event.target.checked }))
                }
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
