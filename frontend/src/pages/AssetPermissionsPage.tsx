import { type FormEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiPlus, FiRotateCcw, FiSave, FiSearch, FiShield, FiUser } from "react-icons/fi";
import { CrudModal } from "../components/CrudModal";
import { useAuth } from "../contexts/AuthContext";
import { readError } from "../lib/format";
import {
  createAssetPermission,
  loadAssetPermissionMeta,
  loadAssetUserPermissions,
  loadAuthAccounts,
  resetAssetUserPermissions,
  updateAssetUserPermissions,
} from "../services/api";
import type { AssetUserPermissions, AuthAccount, PermissionMeta } from "../services/types";

export function AssetPermissionsPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("role_permission_update");
  const canCreate = hasPermission("permission_meta_create");
  const [accounts, setAccounts] = useState<AuthAccount[]>([]);
  const [permissions, setPermissions] = useState<PermissionMeta[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AssetUserPermissions | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newPermission, setNewPermission] = useState({ key: "asset_", label: "", description: "" });

  useEffect(() => {
    Promise.all([loadAuthAccounts(), loadAssetPermissionMeta()])
      .then(([users, meta]) => {
        const sorted = [...users].sort((a, b) =>
          (a.fullName || a.username).localeCompare(b.fullName || b.username, "vi"),
        );
        setAccounts(sorted);
        setPermissions(meta);
        setSelectedId(sorted[0]?.id ?? null);
      })
      .catch((error) => toast.error(readError(error)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      return;
    }
    setDetail(null);
    void loadAssetUserPermissions(selectedId)
      .then((data) => {
        setDetail(data);
        setDraft(new Set(data.effective));
      })
      .catch((error) => toast.error(readError(error)));
  }, [selectedId]);

  const visibleAccounts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return accounts;
    return accounts.filter((account) =>
      [account.fullName, account.username, account.role]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized)),
    );
  }, [accounts, query]);

  const changed = useMemo(() => {
    if (!detail) return false;
    return [...draft].sort().join("|") !== [...detail.effective].sort().join("|");
  }, [detail, draft]);

  const toggle = (key: string) => {
    setDraft((current) => {
      const next = new Set(current);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const save = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      const saved = await updateAssetUserPermissions(detail.userId, [...draft], detail.version);
      setDetail(saved);
      setDraft(new Set(saved.effective));
      toast.success("Đã cập nhật quyền QLVT");
    } catch (error) {
      toast.error(readError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      const saved = await resetAssetUserPermissions(detail.userId, detail.version);
      setDetail(saved);
      setDraft(new Set(saved.effective));
      toast.success("Đã đưa quyền về mặc định theo vai trò và chức vụ");
    } catch (error) {
      toast.error(readError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const submitNewPermission = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const created = await createAssetPermission(newPermission);
      setPermissions((current) =>
        [...current, created].sort((a, b) => a.label.localeCompare(b.label, "vi")),
      );
      setCreateOpen(false);
      setNewPermission({ key: "asset_", label: "", description: "" });
      toast.success("Đã thêm quyền QLVT");
    } catch (error) {
      toast.error(readError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const adminSelected = detail?.role.toUpperCase() === "ADMIN";

  return (
    <section className="permission-admin-page">
      <header className="asset-page-header">
        <div>
          <h2>Phân quyền QLVT</h2>
          <span>Cấu hình phần quyền riêng của từng tài khoản trên nền vai trò và chức vụ.</span>
        </div>
        {canCreate && (
          <button type="button" onClick={() => setCreateOpen(true)}>
            <FiPlus /> Thêm quyền
          </button>
        )}
      </header>

      <div className="permission-admin-workspace">
        <aside className="permission-user-pane">
          <div className="permission-pane-head">
            <strong>Tài khoản</strong>
            <span>{visibleAccounts.length}</span>
          </div>
          <label className="permission-user-search">
            <FiSearch />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên hoặc tài khoản"
            />
          </label>
          <div className="permission-user-list">
            {loading ? (
              <p className="permission-empty">Đang tải...</p>
            ) : (
              visibleAccounts.map((account) => (
                <button
                  type="button"
                  key={account.id}
                  className={selectedId === account.id ? "active" : ""}
                  onClick={() => setSelectedId(account.id)}
                >
                  <FiUser />
                  <span>
                    <strong>{account.fullName || account.username}</strong>
                    <small>
                      {account.username} · {account.role}
                    </small>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="permission-detail-pane">
          {!detail ? (
            <div className="permission-empty-state">
              <FiShield />
              <span>{selectedId ? "Đang tải quyền..." : "Chọn một tài khoản để cấu hình"}</span>
            </div>
          ) : (
            <>
              <div className="permission-detail-head">
                <div>
                  <strong>{detail.fullName || detail.username}</strong>
                  <span>
                    {detail.username} · {detail.role}
                  </span>
                </div>
                <div className="permission-actions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={
                      !canEdit ||
                      adminSelected ||
                      submitting ||
                      detail.added.length + detail.removed.length === 0
                    }
                    onClick={() => void reset()}
                  >
                    <FiRotateCcw /> Về mặc định
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit || adminSelected || submitting || !changed}
                    onClick={() => void save()}
                  >
                    <FiSave /> {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </div>

              {adminSelected && (
                <div className="permission-admin-lock">
                  Tài khoản Admin hệ thống được khóa để giữ đường quản trị khẩn cấp.
                </div>
              )}

              <div className="permission-list-head">
                <strong>Quyền thuộc hệ thống QLVT</strong>
                <span>
                  {draft.size}/{permissions.length} quyền đang có hiệu lực
                </span>
              </div>
              <div className="permission-check-list">
                {permissions.map((permission) => {
                  const inherited = detail.inherited.includes(permission.key);
                  const added = detail.added.includes(permission.key);
                  const removed = detail.removed.includes(permission.key);
                  return (
                    <label key={permission.key}>
                      <input
                        type="checkbox"
                        checked={draft.has(permission.key)}
                        disabled={!canEdit || adminSelected}
                        onChange={() => toggle(permission.key)}
                      />
                      <span>
                        <strong>{permission.label}</strong>
                        <small>{permission.description || permission.key}</small>
                      </span>
                      <code>{permission.key}</code>
                      {added && <em className="permission-added">Cấp riêng</em>}
                      {removed && <em className="permission-removed">Đã gỡ</em>}
                      {inherited && !added && !removed && <em>Kế thừa</em>}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {createOpen && (
        <CrudModal
          title="Thêm quyền QLVT"
          subtitle="Quyền mới chỉ được tạo trong nhóm asset."
          submitting={submitting}
          onClose={() => setCreateOpen(false)}
          onSubmit={submitNewPermission}
        >
          <div className="permission-create-form">
            <label>
              <span>Mã quyền *</span>
              <input
                required
                maxLength={50}
                value={newPermission.key}
                onChange={(event) =>
                  setNewPermission((current) => ({ ...current, key: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Tên quyền *</span>
              <input
                required
                value={newPermission.label}
                onChange={(event) =>
                  setNewPermission((current) => ({ ...current, label: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Mô tả</span>
              <textarea
                rows={4}
                value={newPermission.description}
                onChange={(event) =>
                  setNewPermission((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
          </div>
        </CrudModal>
      )}
    </section>
  );
}
