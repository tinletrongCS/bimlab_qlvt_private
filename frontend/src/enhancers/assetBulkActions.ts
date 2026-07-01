import { employeeLabel, projectLabel } from "../lib/format";
import {
  loadAssets,
  loadDepartments,
  loadEmployees,
  loadProjects,
  loadWorkSites,
  updateAsset,
} from "../services/api";
import type {
  AssetItem,
  AssetPayload,
  DepartmentLite,
  EmployeeLite,
  ProjectLite,
  WorkSiteLite,
} from "../services/types";

type BulkAssetAction = "assign" | "release" | "location" | "status";

type BulkDraft = {
  assignedEmployeeId: string;
  departmentId: string;
  siteId: string;
  projectId: string;
  status: string;
  notes: string;
};

const BULK_DRAFT_DEFAULT: BulkDraft = {
  assignedEmployeeId: "",
  departmentId: "",
  siteId: "",
  projectId: "",
  status: "MAINTENANCE",
  notes: "",
};

const STATUS_OPTIONS = [
  { value: "IN_STOCK", label: "Trong kho" },
  { value: "ASSIGNED", label: "Đã cấp phát" },
  { value: "MAINTENANCE", label: "Cần bảo trì" },
  { value: "DISPOSED", label: "Đã thanh lý" },
  { value: "LOST", label: "Mất" },
];

const selectedAssetCodes = new Set<string>();
let cachedAssets: AssetItem[] = [];
let cachedEmployees: EmployeeLite[] = [];
let cachedDepartments: DepartmentLite[] = [];
let cachedSites: WorkSiteLite[] = [];
let cachedProjects: ProjectLite[] = [];
let syncing = false;
let syncTimer: number | null = null;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function bulkActionTitle(action: BulkAssetAction) {
  const labels: Record<BulkAssetAction, string> = {
    assign: "Cấp phát hàng loạt",
    release: "Thu hồi hàng loạt",
    location: "Chuyển vị trí hàng loạt",
    status: "Cập nhật trạng thái hàng loạt",
  };
  return labels[action];
}

function getAssetListPanel() {
  return document.querySelector<HTMLElement>(".asset-page .asset-list-panel");
}

function getAssetTable() {
  return document.querySelector<HTMLTableElement>(".asset-page .asset-table table");
}

function getAssetCodeFromRow(row: HTMLTableRowElement) {
  return row.querySelector<HTMLElement>(".asset-name-cell span")?.textContent?.trim() || "";
}

function notify(message: string, type: "success" | "error" = "success") {
  const toast = document.createElement("div");
  toast.className = `asset-bulk-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

async function ensureAssets(force = false) {
  if (force || cachedAssets.length === 0) {
    cachedAssets = await loadAssets();
  }
  return cachedAssets;
}

async function ensureLookups() {
  const [employees, departments, sites, projects] = await Promise.all([
    cachedEmployees.length ? Promise.resolve(cachedEmployees) : loadEmployees(),
    cachedDepartments.length ? Promise.resolve(cachedDepartments) : loadDepartments(),
    cachedSites.length ? Promise.resolve(cachedSites) : loadWorkSites(),
    cachedProjects.length ? Promise.resolve(cachedProjects) : loadProjects(),
  ]);
  cachedEmployees = employees;
  cachedDepartments = departments;
  cachedSites = sites;
  cachedProjects = projects;
}

function buildAssetPayload(item: AssetItem): AssetPayload {
  return {
    assetCode: item.assetCode,
    name: item.name,
    category: item.assetCategory?.name || item.category || "",
    serialNumber: item.serialNumber || "",
    source: item.source || "",
    vendorId: item.vendor?.id ?? null,
    assignedEmployeeId: item.assignedEmployeeId ?? null,
    departmentId: item.departmentId ?? null,
    siteId: item.siteId ?? null,
    projectId: item.projectId ?? null,
    purchaseCost: item.purchaseCost ?? item.originalCost ?? null,
    residualValue: item.residualValue ?? item.bookValue ?? null,
    purchaseDate: item.purchaseDate || "",
    warrantyUntil: item.warrantyUntil || "",
    status: item.status,
    depreciationMethod: item.depreciationMethod || "",
    usefulLifeYears:
      item.usefulLifeYears ??
      (item.usefulLifeMonths ? Math.round(item.usefulLifeMonths / 12) : null),
    notes: item.notes || "",
    catalogItemId: item.catalogItem?.id ?? null,
    categoryId: item.assetCategory?.id ?? null,
    parentAssetId: item.parentAsset?.id ?? null,
    assetClass: item.assetClass || "",
    fixedAssetType: item.fixedAssetType || "",
    toolUsageType: item.toolUsageType || "",
    useDate: item.useDate || "",
    depreciationStartDate: item.depreciationStartDate || "",
    originalCost: item.originalCost ?? item.purchaseCost ?? null,
    accumulatedDepreciation: item.accumulatedDepreciation ?? null,
    bookValue: item.bookValue ?? item.residualValue ?? null,
    usefulLifeMonths: item.usefulLifeMonths ?? null,
    depreciationRate: item.depreciationRate ?? null,
    manufactureYear: item.manufactureYear ?? null,
    installationYear: item.installationYear ?? null,
    countryCode: item.countryCode || "",
    capacity: item.capacity ?? null,
    capacityUnit: item.capacityUnit || "",
    realCapacity: item.realCapacity ?? null,
    technicalDescription: item.technicalDescription || "",
  };
}

async function getSelectedAssets() {
  const assets = await ensureAssets(true);
  return assets.filter((asset) => selectedAssetCodes.has(asset.assetCode));
}

function insertSelectionColumn(table: HTMLTableElement) {
  const headerRow = table.querySelector<HTMLTableRowElement>("thead tr");
  if (headerRow && !headerRow.querySelector(".asset-select-column")) {
    const th = document.createElement("th");
    th.className = "asset-select-column";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.setAttribute("aria-label", "Chọn tất cả tài sản trong trang hiện tại");
    checkbox.addEventListener("change", () => toggleVisibleRows(Boolean(checkbox.checked)));
    th.appendChild(checkbox);
    headerRow.prepend(th);
  }

  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>("tbody tr"));
  rows.forEach((row) => {
    const assetCode = getAssetCodeFromRow(row);
    if (!assetCode) return;
    let cell = row.querySelector<HTMLTableCellElement>("td.asset-select-column");
    if (!cell) {
      cell = document.createElement("td");
      cell.className = "asset-select-column";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.setAttribute("aria-label", `Chọn tài sản ${assetCode}`);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selectedAssetCodes.add(assetCode);
        else selectedAssetCodes.delete(assetCode);
        scheduleSync();
      });
      cell.appendChild(checkbox);
      row.prepend(cell);
    }
    const checkbox = cell.querySelector<HTMLInputElement>("input[type='checkbox']");
    if (checkbox) checkbox.checked = selectedAssetCodes.has(assetCode);
    row.dataset.selected = selectedAssetCodes.has(assetCode) ? "true" : "false";
  });

  updateHeaderCheckbox(table);
}

function updateHeaderCheckbox(table: HTMLTableElement) {
  const checkbox = table.querySelector<HTMLInputElement>("thead .asset-select-column input");
  if (!checkbox) return;
  const visibleCodes = Array.from(table.querySelectorAll<HTMLTableRowElement>("tbody tr"))
    .map(getAssetCodeFromRow)
    .filter(Boolean);
  const selectedVisibleCount = visibleCodes.filter((code) => selectedAssetCodes.has(code)).length;
  checkbox.checked = visibleCodes.length > 0 && selectedVisibleCount === visibleCodes.length;
  checkbox.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleCodes.length;
}

function toggleVisibleRows(checked: boolean) {
  const table = getAssetTable();
  if (!table) return;
  Array.from(table.querySelectorAll<HTMLTableRowElement>("tbody tr"))
    .map(getAssetCodeFromRow)
    .filter(Boolean)
    .forEach((code) => {
      if (checked) selectedAssetCodes.add(code);
      else selectedAssetCodes.delete(code);
    });
  scheduleSync();
}

function renderActionBar() {
  const panel = getAssetListPanel();
  if (!panel) return;
  let bar = panel.querySelector<HTMLElement>(".asset-bulk-action-bar");
  if (selectedAssetCodes.size === 0) {
    bar?.remove();
    return;
  }

  if (!bar) {
    bar = document.createElement("div");
    bar.className = "asset-bulk-action-bar";
    const head = panel.querySelector(".asset-list-head");
    head?.insertAdjacentElement("afterend", bar);
  }

  bar.innerHTML = `
    <div class="asset-bulk-summary">
      <span class="asset-bulk-summary-icon">✓</span>
      <div>
        <strong>Đã chọn ${selectedAssetCodes.size} tài sản</strong>
        <span>Thao tác nhanh cho nhóm tài sản đang được tick.</span>
      </div>
    </div>
    <div class="asset-bulk-actions">
      <button type="button" class="secondary" data-bulk-action="print">In QR/Barcode</button>
      <button type="button" class="secondary" data-bulk-action="assign">Cấp phát</button>
      <button type="button" class="secondary" data-bulk-action="release">Thu hồi</button>
      <button type="button" class="secondary" data-bulk-action="location">Chuyển vị trí</button>
      <button type="button" class="secondary" data-bulk-action="status">Cập nhật trạng thái</button>
      <button type="button" class="asset-bulk-clear" data-bulk-action="clear">Bỏ chọn</button>
    </div>`;

  bar.querySelector<HTMLButtonElement>("[data-bulk-action='print']")?.addEventListener("click", () => {
    void printSelectedQr();
  });
  bar.querySelector<HTMLButtonElement>("[data-bulk-action='assign']")?.addEventListener("click", () => {
    void openBulkModal("assign");
  });
  bar.querySelector<HTMLButtonElement>("[data-bulk-action='release']")?.addEventListener("click", () => {
    void openBulkModal("release");
  });
  bar.querySelector<HTMLButtonElement>("[data-bulk-action='location']")?.addEventListener("click", () => {
    void openBulkModal("location");
  });
  bar.querySelector<HTMLButtonElement>("[data-bulk-action='status']")?.addEventListener("click", () => {
    void openBulkModal("status");
  });
  bar.querySelector<HTMLButtonElement>("[data-bulk-action='clear']")?.addEventListener("click", () => {
    selectedAssetCodes.clear();
    scheduleSync();
  });
}

function optionList<T extends { id: number }>(items: T[], label: (item: T) => string) {
  return items.map((item) => `<option value="${item.id}">${escapeHtml(label(item))}</option>`).join("");
}

function renderBulkForm(action: BulkAssetAction) {
  if (action === "assign") {
    return `
      <div class="asset-bulk-form-grid">
        <label>Nhân sự nhận tài sản<select name="assignedEmployeeId" required><option value="">Chọn nhân sự</option>${optionList(cachedEmployees, employeeLabel)}</select></label>
        <label>Phòng ban quản lý<select name="departmentId"><option value="">Giữ nguyên nếu không chọn</option>${optionList(cachedDepartments, (item) => item.name)}</select></label>
        <label>Chi nhánh/kho<select name="siteId"><option value="">Giữ nguyên nếu không chọn</option>${optionList(cachedSites, (item) => item.name)}</select></label>
        <label>Dự án<select name="projectId"><option value="">Không gán dự án</option>${optionList(cachedProjects, projectLabel)}</select></label>
      </div>`;
  }
  if (action === "release") {
    return `
      <div class="asset-bulk-form-grid">
        <label>Thu hồi về chi nhánh/kho<select name="siteId"><option value="">Giữ nguyên vị trí hiện tại</option>${optionList(cachedSites, (item) => item.name)}</select></label>
        <label>Phòng ban tiếp nhận<select name="departmentId"><option value="">Giữ nguyên phòng ban</option>${optionList(cachedDepartments, (item) => item.name)}</select></label>
      </div>`;
  }
  if (action === "location") {
    return `
      <div class="asset-bulk-form-grid">
        <label>Chi nhánh/kho mới<select name="siteId"><option value="">Không cập nhật</option>${optionList(cachedSites, (item) => item.name)}</select></label>
        <label>Phòng ban mới<select name="departmentId"><option value="">Không cập nhật</option>${optionList(cachedDepartments, (item) => item.name)}</select></label>
        <label>Dự án mới<select name="projectId"><option value="">Không cập nhật</option>${optionList(cachedProjects, projectLabel)}</select></label>
      </div>`;
  }
  return `
    <div class="asset-bulk-form-grid single">
      <label>Trạng thái mới<select name="status">${STATUS_OPTIONS.map((item) => `<option value="${item.value}">${item.label}</option>`).join("")}</select></label>
    </div>`;
}

async function openBulkModal(action: BulkAssetAction) {
  if (selectedAssetCodes.size === 0) return;
  await ensureLookups();
  document.querySelector(".asset-bulk-dom-modal")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "modal-backdrop asset-bulk-dom-modal";
  overlay.innerHTML = `
    <div class="crud-modal asset-bulk-modal">
      <div class="modal-head">
        <div class="modal-title-group">
          <span class="modal-title-icon edit">✓</span>
          <div>
            <h2>${bulkActionTitle(action)}</h2>
            <p>Áp dụng cho ${selectedAssetCodes.size} tài sản đang chọn.</p>
          </div>
        </div>
        <button type="button" class="icon-button" data-close>×</button>
      </div>
      <form class="asset-bulk-modal-body">
        <div class="asset-bulk-selected-preview">
          ${Array.from(selectedAssetCodes).slice(0, 5).map((code) => `<span>${escapeHtml(code)}</span>`).join("")}
          ${selectedAssetCodes.size > 5 ? `<span>+${selectedAssetCodes.size - 5} tài sản</span>` : ""}
        </div>
        ${renderBulkForm(action)}
        <label class="asset-bulk-note">Ghi chú thao tác<textarea name="notes" rows="3" placeholder="Ví dụ: chuyển lô máy in từ kho A sang kho B, thu hồi thiết bị dự án X..."></textarea></label>
      </form>
      <div class="modal-actions">
        <button type="button" class="secondary" data-close>Hủy</button>
        <button type="button" class="primary-action" data-apply>Áp dụng cho ${selectedAssetCodes.size} tài sản</button>
      </div>
    </div>`;

  overlay.querySelectorAll<HTMLElement>("[data-close]").forEach((item) =>
    item.addEventListener("click", () => overlay.remove()),
  );
  overlay.querySelector<HTMLElement>("[data-apply]")?.addEventListener("click", () => {
    void applyBulkAction(action, overlay);
  });
  document.body.appendChild(overlay);
}

function readBulkDraft(container: HTMLElement): BulkDraft {
  const form = container.querySelector<HTMLFormElement>("form");
  const data = new FormData(form || undefined);
  return {
    assignedEmployeeId: String(data.get("assignedEmployeeId") || ""),
    departmentId: String(data.get("departmentId") || ""),
    siteId: String(data.get("siteId") || ""),
    projectId: String(data.get("projectId") || ""),
    status: String(data.get("status") || BULK_DRAFT_DEFAULT.status),
    notes: String(data.get("notes") || ""),
  };
}

function appendBulkNote(asset: AssetItem, action: BulkAssetAction, note: string) {
  const trimmed = note.trim();
  if (!trimmed) return asset.notes || "";
  const prefix = `${bulkActionTitle(action)} - ${new Date().toLocaleString("vi-VN")}`;
  return [asset.notes, `${prefix}: ${trimmed}`].filter(Boolean).join("\n");
}

async function applyBulkAction(action: BulkAssetAction, overlay: HTMLElement) {
  const applyButton = overlay.querySelector<HTMLButtonElement>("[data-apply]");
  const draft = readBulkDraft(overlay);

  if (action === "assign" && !draft.assignedEmployeeId.trim()) {
    notify("Chọn nhân sự nhận tài sản trước khi cấp phát hàng loạt.", "error");
    return;
  }
  if (action === "location" && !draft.siteId && !draft.departmentId && !draft.projectId) {
    notify("Chọn ít nhất một vị trí/phòng ban/dự án cần cập nhật.", "error");
    return;
  }

  applyButton?.setAttribute("disabled", "true");
  try {
    const selectedAssets = await getSelectedAssets();
    for (const asset of selectedAssets) {
      const payload = buildAssetPayload(asset);

      if (action === "assign") {
        payload.assignedEmployeeId = optionalNumber(draft.assignedEmployeeId);
        if (draft.departmentId) payload.departmentId = optionalNumber(draft.departmentId);
        if (draft.siteId) payload.siteId = optionalNumber(draft.siteId);
        if (draft.projectId) payload.projectId = optionalNumber(draft.projectId);
        payload.status = "ASSIGNED";
      }

      if (action === "release") {
        payload.assignedEmployeeId = null;
        payload.projectId = null;
        if (draft.departmentId) payload.departmentId = optionalNumber(draft.departmentId);
        if (draft.siteId) payload.siteId = optionalNumber(draft.siteId);
        payload.status = "IN_STOCK";
      }

      if (action === "location") {
        if (draft.departmentId) payload.departmentId = optionalNumber(draft.departmentId);
        if (draft.siteId) payload.siteId = optionalNumber(draft.siteId);
        if (draft.projectId) payload.projectId = optionalNumber(draft.projectId);
      }

      if (action === "status") {
        payload.status = draft.status;
      }

      payload.notes = appendBulkNote(asset, action, draft.notes);
      await updateAsset(asset.id, payload);
    }

    notify(`Đã cập nhật ${selectedAssets.length} tài sản.`);
    selectedAssetCodes.clear();
    overlay.remove();
    window.setTimeout(() => window.location.reload(), 650);
  } catch {
    notify("Không cập nhật được thao tác hàng loạt. Vui lòng thử lại.", "error");
    applyButton?.removeAttribute("disabled");
  }
}

async function printSelectedQr() {
  const selectedAssets = await getSelectedAssets();
  if (selectedAssets.length === 0) {
    notify("Chọn tài sản cần in QR/Barcode.", "error");
    return;
  }
  const cards = selectedAssets
    .map(
      (asset) => `
        <article class="qr-card">
          <div class="qr-box"><span>QR</span><strong>${escapeHtml(asset.assetCode)}</strong></div>
          <div class="qr-meta">
            <strong>${escapeHtml(asset.name)}</strong>
            <span>${escapeHtml(asset.assetCategory?.name || asset.category || "Chưa phân loại")}</span>
            <small>${escapeHtml(asset.assetCode)}</small>
          </div>
        </article>`,
    )
    .join("");

  const printWindow = window.open("", "_blank", "width=1100,height=780");
  if (!printWindow) {
    notify("Trình duyệt đang chặn popup in QR/Barcode.", "error");
    return;
  }
  printWindow.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"/><title>In QR/Barcode tài sản</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111827;margin:0}h1{font-size:18px;margin:0 0 4px}p{color:#64748b;font-size:12px;margin:0 0 14px}.sheet{display:grid;gap:10px;grid-template-columns:repeat(3,1fr)}.qr-card{border:1px dashed #94a3b8;border-radius:10px;display:grid;gap:8px;grid-template-columns:84px 1fr;min-height:108px;padding:10px;page-break-inside:avoid}.qr-box{align-items:center;border:1px solid #dbeafe;border-radius:8px;display:grid;justify-items:center;min-height:84px;padding:8px}.qr-box span{color:#154d7c;font-size:24px;font-weight:800;letter-spacing:.08em}.qr-box strong{color:#0f172a;font-size:10px;margin-top:4px;overflow-wrap:anywhere;text-align:center}.qr-meta{min-width:0}.qr-meta strong{display:block;font-size:12px;line-height:1.35;margin-bottom:5px}.qr-meta span,.qr-meta small{color:#64748b;display:block;font-size:10.5px;line-height:1.35;overflow-wrap:anywhere}</style></head><body><h1>Phiếu in QR/Barcode tài sản</h1><p>${selectedAssets.length} tài sản được chọn · Có thể bấm In và lưu thành PDF.</p><main class="sheet">${cards}</main></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 300);
}

function scheduleSync() {
  if (syncTimer) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(syncBulkUi, 120);
}

function syncBulkUi() {
  if (syncing) return;
  syncing = true;
  try {
    const table = getAssetTable();
    if (!table) {
      document.querySelector(".asset-bulk-action-bar")?.remove();
      return;
    }
    insertSelectionColumn(table);
    renderActionBar();
  } finally {
    syncing = false;
  }
}

declare global {
  interface Window {
    __bimlabAssetBulkEnhancerStarted?: boolean;
  }
}

if (typeof window !== "undefined" && !window.__bimlabAssetBulkEnhancerStarted) {
  window.__bimlabAssetBulkEnhancerStarted = true;
  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("hashchange", scheduleSync);
  window.addEventListener("popstate", scheduleSync);
  scheduleSync();
}
