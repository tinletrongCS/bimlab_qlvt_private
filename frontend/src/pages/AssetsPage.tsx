import QRCode from "qrcode";
import {
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import {
  FiBold,
  FiCheckSquare,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiClock,
  FiDownload,
  FiEdit2,
  FiEye,
  FiFileText,
  FiFolderPlus,
  FiGrid,
  FiPrinter,
  FiRotateCcw,
  FiSearch,
  FiTrash2,
  FiUnderline,
  FiUpload,
  FiX,
} from "react-icons/fi";
import { SearchableSelect } from "../components/forms/SearchableSelect";
import { OverflowActions } from "../components/OverflowActions";
import { StatusBadge } from "../components/StatusBadge";
import { useActions } from "../contexts/ActionsContext";
import { useAppData } from "../contexts/AppDataContext";
import { useAuth } from "../contexts/AuthContext";
import {
  addAssetCategoryDropdowns,
  addCategoryReferenceSheet,
  addHierarchicalCategorySheet,
  CATEGORY_REFERENCE_SHEET_NAME,
} from "../lib/categoryExcel";
import { employeeLabel, money, projectLabel, readError } from "../lib/format";
import {
  assignAssetCatalog,
  commitAssetImport,
  deleteAsset,
  issueAssetQrCodes,
  loadAssetCatalogItems,
  loadAssetCategoryTree,
  loadAssetChangeHistory,
  updateAsset,
  validateAssetImport,
} from "../services/api";
import type {
  AssetCatalogItemListItem,
  AssetCatalogType,
  AssetCategoryTree,
  AssetChangeLog,
  AssetImportCommitPayload,
  AssetImportRowPayload,
  AssetImportValidationResponse,
  AssetItem,
  AssetPayload,
  AssetQrCode,
} from "../services/types";

type AssetStatusFilter = "ALL" | "IN_STOCK" | "ASSIGNED" | "MAINTENANCE" | "DISPOSED";
type AssetValueFilter = "ALL" | "UNDER_10M" | "FROM_10M_TO_50M" | "FROM_50M_TO_200M" | "FROM_200M";
type ImportMode = AssetImportCommitPayload["importMode"];
type ImportPreviewFilter = "ALL" | "VALID" | "INVALID" | "WARNING";
type AssetBulkAction = "status" | "move" | "assign" | "return" | "catalog" | "qr" | null;
type AssetDetailView = "details" | "history";
type BulkCatalogMode = "existing" | "change" | "new";
type CatalogViewFilter = {
  id: number | null;
  name: string;
};
type AssetTableColumnId =
  | "asset"
  | "category"
  | "catalogName"
  | "catalogCode"
  | "serialNumber"
  | "contractNumber"
  | "invoiceNumber"
  | "status"
  | "purchaseCost"
  | "originalCost"
  | "bookValue"
  | "source"
  | "site"
  | "department"
  | "employee"
  | "vendor"
  | "project"
  | "purchaseDate"
  | "warrantyUntil"
  | "categoryCode";

interface AssetTableColumnConfig {
  id: AssetTableColumnId;
  label: string;
  locked?: boolean;
  defaultVisible?: boolean;
}

interface AssetTableColumnDefinition extends AssetTableColumnConfig {
  render: (item: AssetItem) => ReactNode;
  align?: "right" | "center";
}

const CALENDAR_YEAR_OPTIONS = [
  { value: "", label: "Chưa chọn năm" },
  ...Array.from({ length: 2100 - 1970 + 1 }, (_, index) => {
    const year = String(1970 + index);
    return { value: year, label: year };
  }),
];

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const RICH_TEXT_PATTERN = /<(?:strong|b|em|i|u|span|font|br|div|p)\b/i;
const RICH_TEXT_COLORS = [
  { label: "Xám", value: "#475569", rgb: "rgb(71,85,105)" },
  { label: "Đen", value: "#111827", rgb: "rgb(17,24,39)" },
  { label: "Đỏ", value: "#b91c1c", rgb: "rgb(185,28,28)" },
  { label: "Cam", value: "#c2410c", rgb: "rgb(194,65,12)" },
  { label: "Xanh lá", value: "#15803d", rgb: "rgb(21,128,61)" },
  { label: "Xanh dương", value: "#1d4ed8", rgb: "rgb(29,78,216)" },
] as const;

function normalizeRichTextColor(value: string) {
  const normalized = value.toLowerCase().replaceAll(" ", "");
  return (
    RICH_TEXT_COLORS.find((color) => color.value === normalized || color.rgb === normalized)
      ?.value || ""
  );
}

function sanitizeRichText(value: string) {
  const body = new DOMParser().parseFromString(value, "text/html").body;

  const renderNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent || "");
    if (!(node instanceof HTMLElement)) return "";

    const tags: Record<string, string> = {
      B: "strong",
      STRONG: "strong",
      I: "em",
      EM: "em",
      U: "u",
      SPAN: "span",
      FONT: "span",
      BR: "br",
      DIV: "div",
      P: "p",
    };
    const tag = tags[node.tagName];
    const content = Array.from(node.childNodes).map(renderNode).join("");
    if (!tag) return content;
    if (tag === "br") return "<br>";

    const rawColor = node.getAttribute("color") || node.style.color;
    const color = tag === "span" ? normalizeRichTextColor(rawColor) : "";
    return `<${tag}${color ? ` style="color: ${color}"` : ""}>${content}</${tag}>`;
  };

  return Array.from(body.childNodes).map(renderNode).join("");
}

function richTextEditorHtml(value: string) {
  return RICH_TEXT_PATTERN.test(value)
    ? sanitizeRichText(value)
    : escapeHtml(value).replace(/\r?\n/g, "<br>");
}

export function richTextStorageValue(value: string) {
  return RICH_TEXT_PATTERN.test(value) ? sanitizeRichText(value) : value;
}

export function RichTextEditor({
  label,
  value,
  onChange,
  disabled,
  minHeight,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minHeight?: number;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    underline: false,
  });
  const [activeColor, setActiveColor] = useState<string>(RICH_TEXT_COLORS[0].value);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    const next = richTextEditorHtml(value);
    if (editor.innerHTML !== next) editor.innerHTML = next;
  }, [value]);

  useEffect(() => {
    const captureSelection = () => {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (editor && selection?.rangeCount && editor.contains(selection.anchorNode)) {
        selectionRef.current = selection.getRangeAt(0).cloneRange();
      }
    };
    document.addEventListener("selectionchange", captureSelection);
    return () => document.removeEventListener("selectionchange", captureSelection);
  }, []);

  const refreshToolbarState = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount || !editor.contains(selection.anchorNode)) return;
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      underline: document.queryCommandState("underline"),
    });
    setActiveColor(
      normalizeRichTextColor(String(document.queryCommandValue("foreColor"))) ||
        RICH_TEXT_COLORS[0].value,
    );
  };

  const rememberSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (editor && selection?.rangeCount && editor.contains(selection.anchorNode)) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
      refreshToolbarState();
    }
  };

  const emitValue = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const text = editor.textContent?.replace(/\u00a0/g, " ").trim() || "";
    if (!text) {
      onChange("");
      return;
    }
    const html = sanitizeRichText(editor.innerHTML);
    onChange(RICH_TEXT_PATTERN.test(html) ? html : `<p>${html}</p>`);
  };

  const wrapSelectedText = (
    range: Range,
    command: "bold" | "underline" | "foreColor",
    color?: string,
  ) => {
    const tagName = command === "bold" ? "strong" : command === "underline" ? "u" : "span";
    const wrapper = document.createElement(tagName);
    if (command === "foreColor" && color) wrapper.style.color = color;
    wrapper.append(range.extractContents());
    range.insertNode(wrapper);
    range.selectNodeContents(wrapper);
  };

  const selectedFormatElement = (range: Range, command: "bold" | "underline" | "foreColor") => {
    if (command === "foreColor") return null;
    const selector = command === "bold" ? "strong, b" : "u";
    const closest = (node: Node) => {
      const element = node instanceof HTMLElement ? node : node.parentElement;
      if (!element || element === editorRef.current) return null;
      return element.matches(selector) ? element : element.closest<HTMLElement>(selector);
    };
    const start = closest(range.startContainer);
    const end = closest(range.endContainer);
    return start && start === end && editorRef.current?.contains(start) ? start : null;
  };

  const unwrapSelectedText = (range: Range, wrapper: HTMLElement) => {
    const parent = wrapper.parentNode;
    const first = wrapper.firstChild;
    const last = wrapper.lastChild;
    if (!parent || !first || !last) return false;
    while (wrapper.firstChild) parent.insertBefore(wrapper.firstChild, wrapper);
    wrapper.remove();
    range.setStartBefore(first);
    range.setEndAfter(last);
    return true;
  };

  const format = (command: "bold" | "underline" | "foreColor", color?: string) => {
    if (disabled) return;
    const editor = editorRef.current;
    if (!editor) return;
    const savedRange = selectionRef.current?.cloneRange();
    editor.focus({ preventScroll: true });
    const selection = window.getSelection();
    if (savedRange && selection && editor.contains(savedRange.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
    const activeRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const formatElementBefore = activeRange ? selectedFormatElement(activeRange, command) : null;
    const htmlBefore = editor.innerHTML;
    const wasActive =
      Boolean(formatElementBefore) ||
      (command !== "foreColor" && document.queryCommandState(command));
    document.execCommand("styleWithCSS", false, "false");
    const commandHandled = document.execCommand(command, false, color);

    if (
      editor.innerHTML === htmlBefore &&
      wasActive &&
      formatElementBefore &&
      selection &&
      activeRange &&
      unwrapSelectedText(activeRange, formatElementBefore)
    ) {
      selection.removeAllRanges();
      selection.addRange(activeRange);
    } else if (
      (!commandHandled || editor.innerHTML === htmlBefore) &&
      !wasActive &&
      selection &&
      activeRange &&
      !activeRange.collapsed &&
      editor.contains(activeRange.commonAncestorContainer)
    ) {
      wrapSelectedText(activeRange, command, color);
      selection.removeAllRanges();
      selection.addRange(activeRange);
    }
    if (selection?.rangeCount) selectionRef.current = selection.getRangeAt(0).cloneRange();
    refreshToolbarState();
    emitValue();
  };

  return (
    <div className="asset-detail-wide-field asset-rich-text-field">
      <span>{label}</span>
      <div className="asset-rich-text-editor" data-disabled={disabled || undefined}>
        <div className="asset-rich-text-toolbar" role="toolbar" aria-label={`Định dạng ${label}`}>
          <button
            type="button"
            aria-label={`In đậm ${label}`}
            aria-pressed={activeFormats.bold}
            className={activeFormats.bold ? "is-active" : undefined}
            title="In đậm"
            onMouseDown={(event) => {
              event.preventDefault();
              format("bold");
            }}
            onClick={(event) => event.detail === 0 && format("bold")}
            disabled={disabled}
          >
            <FiBold />
          </button>
          <button
            type="button"
            aria-label={`Gạch chân ${label}`}
            aria-pressed={activeFormats.underline}
            className={activeFormats.underline ? "is-active" : undefined}
            title="Gạch chân"
            onMouseDown={(event) => {
              event.preventDefault();
              format("underline");
            }}
            onClick={(event) => event.detail === 0 && format("underline")}
            disabled={disabled}
          >
            <FiUnderline />
          </button>
          <div className="asset-rich-text-colors" role="group" aria-label={`Màu chữ ${label}`}>
            <span>Màu chữ</span>
            {RICH_TEXT_COLORS.map((color) => (
              <button
                type="button"
                key={color.value}
                className={`asset-rich-text-swatch${activeColor === color.value ? " is-active" : ""}`}
                aria-label={`${color.label} - ${label}`}
                aria-pressed={activeColor === color.value}
                title={color.label}
                style={{ "--asset-swatch-color": color.value } as CSSProperties}
                onMouseDown={(event) => {
                  event.preventDefault();
                  format("foreColor", color.value);
                }}
                onClick={(event) => event.detail === 0 && format("foreColor", color.value)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
        <div
          ref={editorRef}
          className="asset-rich-text-content"
          role="textbox"
          aria-label={label}
          aria-multiline="true"
          tabIndex={disabled ? -1 : 0}
          contentEditable={!disabled}
          suppressContentEditableWarning
          style={{ minHeight }}
          onInput={emitValue}
          onFocus={refreshToolbarState}
          onMouseUp={rememberSelection}
          onKeyUp={rememberSelection}
          onBlur={rememberSelection}
          onPaste={(event) => {
            event.preventDefault();
            document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
            emitValue();
          }}
        />
      </div>
    </div>
  );
}

async function renderQrPrint(printWindow: Window, codes: AssetQrCode[]) {
  const logoUrl = new URL("/light background.png", window.location.origin).href;
  const labels = await Promise.all(
    codes.map(async (code) => ({
      ...code,
      svg: await QRCode.toString(code.publicUrl, {
        type: "svg",
        errorCorrectionLevel: "M",
        margin: 1,
        width: 260,
      }),
    })),
  );
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>In mã QR tài sản</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #172033; font-family: Inter, Arial, "Segoe UI", sans-serif; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 31.5mm;
            gap: 2mm 3mm; }
          .label { min-width: 0; padding: 2mm; display: grid; grid-template-columns: 22mm minmax(0, 1fr);
            align-items: center; gap: 3mm; border: 1px solid #cbd5e1; break-inside: avoid; text-align: left; }
          .qr { grid-column: 1; grid-row: 1; width: 22mm; height: 22mm; margin: 0; }
          .qr svg { display: block; width: 100%; height: 100%; }
          .info { grid-column: 2; grid-row: 1; min-width: 0; height: 22mm; margin: 0; overflow: hidden;
            display: grid; align-content: start; gap: 1mm; }
          .logo { display: block; width: 40mm; height: auto; margin: 0; object-fit: contain; object-position: left top;
            line-height: 0; vertical-align: top; }
          .asset-code { color: #172033; font-size: 8pt; font-weight: 800; line-height: 1.15;
            overflow-wrap: anywhere; word-break: break-all; }
          .asset-name { color: #475569; font-size: 7pt; font-weight: 600; line-height: 1.2;
            display: -webkit-box; overflow: hidden; overflow-wrap: anywhere; -webkit-box-orient: vertical;
            -webkit-line-clamp: 2; }
        </style>
      </head>
      <body>
        <div class="grid">
          ${labels
            .map((code) => {
              const codeLength = Array.from(code.assetCode).length;
              const nameLength = Array.from(code.assetName).length;
              const codeFontSize =
                codeLength > 48 ? 5 : codeLength > 36 ? 5.8 : codeLength > 26 ? 6.8 : 8;
              const nameFontSize = nameLength > 60 ? 5.8 : nameLength > 38 ? 6.3 : 7;
              return `<article class="label">
                 <div class="qr">${code.svg}</div>
                 <div class="info">
                   <img class="logo" src="${escapeHtml(logoUrl)}" alt="BIMLab">
                   <strong class="asset-code" style="font-size:${codeFontSize}pt">${escapeHtml(code.assetCode)}</strong>
                   <span class="asset-name" style="font-size:${nameFontSize}pt">${escapeHtml(code.assetName)}</span>
                 </div>
               </article>`;
            })
            .join("")}
        </div>
      </body>
    </html>`);
  printWindow.document.close();
  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 150);
}

const ASSET_VALUE_FILTERS: Array<{
  value: AssetValueFilter;
  label: string;
  min?: number;
  max?: number;
}> = [
  { value: "ALL", label: "Tất cả giá trị" },
  { value: "UNDER_10M", label: "Dưới 10 triệu", max: 10_000_000 },
  { value: "FROM_10M_TO_50M", label: "10 - 50 triệu", min: 10_000_000, max: 50_000_000 },
  { value: "FROM_50M_TO_200M", label: "50 - 200 triệu", min: 50_000_000, max: 200_000_000 },
  { value: "FROM_200M", label: "Trên 200 triệu", min: 200_000_000 },
];
const ASSET_MUTABLE_STATUSES = ["IN_STOCK", "ASSIGNED", "MAINTENANCE", "DISPOSED", "LOST"] as const;
const ASSET_TABLE_STORAGE_KEY = "qlvt.assetList.tableColumns.v1";
const ASSET_TABLE_COLUMNS: AssetTableColumnConfig[] = [
  { id: "asset", label: "Tài sản", locked: true, defaultVisible: true },
  { id: "category", label: "Loại", locked: true, defaultVisible: true },
  { id: "catalogName", label: "Tên danh mục", defaultVisible: true },
  { id: "catalogCode", label: "Mã danh mục", defaultVisible: true },
  { id: "categoryCode", label: "Mã loại", defaultVisible: false },
  { id: "serialNumber", label: "Serial/MAC", defaultVisible: false },
  { id: "contractNumber", label: "Số hợp đồng", defaultVisible: true },
  { id: "invoiceNumber", label: "Số hóa đơn", defaultVisible: true },
  { id: "status", label: "Trạng thái", defaultVisible: true },
  { id: "purchaseCost", label: "Giá trị mua", defaultVisible: true },
  { id: "originalCost", label: "Nguyên giá", defaultVisible: false },
  { id: "bookValue", label: "Giá trị còn lại", defaultVisible: false },
  { id: "source", label: "Nguồn hình thành", defaultVisible: false },
  { id: "site", label: "Chi nhánh", defaultVisible: false },
  { id: "department", label: "Phòng ban", defaultVisible: false },
  { id: "employee", label: "Người giữ", defaultVisible: false },
  { id: "vendor", label: "Nhà cung cấp", defaultVisible: false },
  { id: "project", label: "Dự án", defaultVisible: false },
  { id: "purchaseDate", label: "Ngày mua", defaultVisible: false },
  { id: "warrantyUntil", label: "Bảo hành đến", defaultVisible: false },
];
const ASSET_TABLE_COLUMN_WIDTHS: Record<AssetTableColumnId, number> = {
  asset: 190,
  category: 150,
  catalogName: 190,
  catalogCode: 150,
  categoryCode: 150,
  serialNumber: 160,
  contractNumber: 150,
  invoiceNumber: 150,
  status: 118,
  purchaseCost: 138,
  originalCost: 138,
  bookValue: 138,
  source: 160,
  site: 160,
  department: 160,
  employee: 160,
  vendor: 160,
  project: 160,
  purchaseDate: 138,
  warrantyUntil: 138,
};
const ASSET_TABLE_SELECT_WIDTH = 42;
const ASSET_TABLE_INDEX_WIDTH = 36;
const ASSET_TABLE_ACTIONS_WIDTH = 86;
const ASSET_TABLE_COLUMN_IDS = ASSET_TABLE_COLUMNS.map((column) => column.id);
const DEFAULT_ASSET_TABLE_VISIBLE_COLUMNS = ASSET_TABLE_COLUMNS.filter(
  (column) => column.defaultVisible || column.locked,
).map((column) => column.id);
type SheetCell = string | number | boolean | Date | null | undefined;
type SheetRow = SheetCell[];

function normalizeAssetColumnOrder(order: AssetTableColumnId[]) {
  const middleColumns = [
    ...order.filter(
      (id) => ASSET_TABLE_COLUMN_IDS.includes(id) && id !== "asset" && id !== "category",
    ),
    ...ASSET_TABLE_COLUMN_IDS.filter(
      (id) => !order.includes(id) && id !== "asset" && id !== "category",
    ),
  ];
  return ["asset", "category", ...middleColumns] as AssetTableColumnId[];
}

function readAssetColumnPreferences() {
  if (typeof window === "undefined") {
    return {
      order: normalizeAssetColumnOrder(ASSET_TABLE_COLUMN_IDS),
      visible: DEFAULT_ASSET_TABLE_VISIBLE_COLUMNS,
    };
  }

  try {
    const raw = window.localStorage.getItem(ASSET_TABLE_STORAGE_KEY);
    if (!raw) {
      return {
        order: normalizeAssetColumnOrder(ASSET_TABLE_COLUMN_IDS),
        visible: DEFAULT_ASSET_TABLE_VISIBLE_COLUMNS,
      };
    }
    const parsed = JSON.parse(raw) as Partial<{
      order: AssetTableColumnId[];
      visible: AssetTableColumnId[];
    }>;
    const knownIds = new Set(ASSET_TABLE_COLUMN_IDS);
    const order = [
      ...(parsed.order || []).filter((id): id is AssetTableColumnId => knownIds.has(id)),
      ...ASSET_TABLE_COLUMN_IDS.filter((id) => !(parsed.order || []).includes(id)),
    ];
    const visible = Array.from(
      new Set([
        ...(parsed.visible || []).filter((id): id is AssetTableColumnId => knownIds.has(id)),
        ...ASSET_TABLE_COLUMNS.filter(
          (column) => column.defaultVisible && !(parsed.order || []).includes(column.id),
        ).map((column) => column.id),
        ...ASSET_TABLE_COLUMNS.filter((column) => column.locked).map((column) => column.id),
      ]),
    );
    return { order: normalizeAssetColumnOrder(order), visible };
  } catch {
    return {
      order: normalizeAssetColumnOrder(ASSET_TABLE_COLUMN_IDS),
      visible: DEFAULT_ASSET_TABLE_VISIBLE_COLUMNS,
    };
  }
}

function readCatalogViewFilter(): CatalogViewFilter {
  if (typeof window === "undefined") return { id: null, name: "" };

  const params = new URLSearchParams(window.location.search);
  const parsedId = Number(params.get("catalogItemId"));
  return {
    id: Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null,
    name: params.get("catalogName")?.trim() || "",
  };
}

function revealFullFieldValue(event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) {
  const field = event.target;
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
    field.title = field.value;
  }
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ALL: "Tất cả trạng thái",
    IN_STOCK: "Trong kho",
    ASSIGNED: "Đã cấp phát",
    MAINTENANCE: "Bảo trì",
    DISPOSED: "Đã thanh lý",
    LOST: "Mất/hỏng",
  };
  return labels[status] || status;
}

function collectCategoryIds(node: AssetCategoryTree): Set<number> {
  const ids = new Set<number>([node.id]);
  node.children.forEach((child) => {
    collectCategoryIds(child).forEach((id) => {
      ids.add(id);
    });
  });
  return ids;
}

function collectCategoryCodes(node: AssetCategoryTree): Set<string> {
  const codes = new Set<string>();
  if (node.code) codes.add(node.code);
  node.children.forEach((child) => {
    collectCategoryCodes(child).forEach((code) => {
      codes.add(code);
    });
  });
  return codes;
}

function findCategoryPath(nodes: AssetCategoryTree[], path: string[]): AssetCategoryTree[] {
  const result: AssetCategoryTree[] = [];
  let current = nodes;
  for (const rawId of path) {
    const node = current.find((item) => String(item.id) === rawId);
    if (!node) break;
    result.push(node);
    current = node.children;
  }
  return result;
}

function findCategoryIdPath(
  nodes: AssetCategoryTree[],
  targetId: number,
  path: string[] = [],
): string[] {
  for (const node of nodes) {
    const nextPath = [...path, String(node.id)];
    if (node.id === targetId) return nextPath;
    const childPath = findCategoryIdPath(node.children, targetId, nextPath);
    if (childPath.length > 0) return childPath;
  }
  return [];
}

function buildAssetPayload(item: AssetItem): AssetPayload {
  return {
    assetCode: item.assetCode,
    name: item.name,
    category: item.assetCategory?.name || item.category || "",
    serialNumber: item.serialNumber || "",
    source: item.source || "",
    contractNumber: item.contractNumber || "",
    invoiceNumber: item.invoiceNumber || "",
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
    disposalDate: item.disposalDate || "",
    disposalPrice: item.disposalPrice ?? null,
    disposalReason: item.disposalReason || "",
  };
}

function optionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function classLabel(value?: string) {
  if (!value) return "Chưa phân loại";
  const labels: Record<string, string> = {
    FIXED_ASSET: "Tài sản cố định",
    TOOL_EQUIPMENT: "Công cụ dụng cụ",
    TANGIBLE: "Hữu hình",
    INTANGIBLE: "Vô hình",
    SINGLE_USE: "Dùng một lần",
    MULTI_USE: "Dùng nhiều lần",
  };
  return labels[value] || value;
}

function catalogTypeForAssetClass(assetClass?: string): AssetCatalogType {
  return assetClass === "TOOL_EQUIPMENT" ? "TOOL" : "ASSET";
}

function catalogAssignmentLabel(
  item: Pick<AssetCatalogItemListItem, "itemCode" | "name"> &
    Partial<Pick<AssetCatalogItemListItem, "categoryName" | "categoryCode">> & {
      category?: { name?: string; code?: string } | null;
    },
) {
  return `${item.itemCode} - ${item.name}`;
}

function highlightSearchText(value: string, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return value;
  const lower = value.toLowerCase();
  const index = lower.indexOf(normalizedQuery);
  if (index < 0) return value;
  return (
    <>
      {value.slice(0, index)}
      <mark className="search-match">{value.slice(index, index + normalizedQuery.length)}</mark>
      {value.slice(index + normalizedQuery.length)}
    </>
  );
}

function importStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    VALID: "Hợp lệ",
    INVALID: "Lỗi",
    WARNING: "Cảnh báo",
    IMPORTED: "Đã nhập",
    SKIPPED: "Bỏ qua",
  };
  return status ? labels[status] || status : "Chưa kiểm tra";
}

function dateTimeLabel(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN");
}

const ASSET_AUDIT_FIELD_LABELS: Record<string, string> = {
  assignedEmployeeId: "Nhân sự đang giữ",
  departmentId: "Phòng ban",
  siteId: "Chi nhánh",
  projectId: "Dự án",
  useDate: "Ngày bắt đầu sử dụng",
  status: "Trạng thái",
};

const ASSET_AUDIT_ACTION_LABELS: Record<string, string> = {
  TRANSFER_APPROVED: "Phiếu bàn giao được phê duyệt",
  ASSET_UPDATED: "Cập nhật thông tin tài sản",
};

function dateKey(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  const normalized = value.trim();
  return normalized.length >= 10 ? normalized.slice(0, 10) : normalized;
}

function assetMatchesCategoryNode(
  asset: AssetItem,
  node: AssetCategoryTree,
  descendantIds?: Set<number> | null,
  descendantCodes?: Set<string> | null,
) {
  const assetCategoryId = asset.assetCategory?.id;
  if (assetCategoryId && descendantIds?.has(assetCategoryId)) return true;

  const assetCategoryCode = asset.category || asset.assetCategory?.code;
  if (assetCategoryCode && descendantCodes?.has(assetCategoryCode)) return true;

  return false;
}

function AssetCategoryFilterNode({
  node,
  selectedId,
  selectedPathIds,
  expandedIds,
  assetCounts,
  onSelect,
  onToggle,
}: {
  node: AssetCategoryTree;
  selectedId?: number;
  selectedPathIds: Set<number>;
  expandedIds: Set<number>;
  assetCounts: Map<number, number>;
  onSelect: (category: AssetCategoryTree) => void;
  onToggle: (id: number) => void;
}) {
  const count = assetCounts.get(node.id) ?? 0;
  const hasChildren = node.children.length > 0;
  const open = expandedIds.has(node.id) || (selectedPathIds.has(node.id) && selectedId !== node.id);

  return (
    <div className="asset-category-filter-node">
      <button
        type="button"
        className="asset-category-filter-item"
        data-selected={selectedId === node.id ? "true" : undefined}
        onClick={() => {
          onSelect(node);
          if (hasChildren) onToggle(node.id);
        }}
      >
        {hasChildren ? (
          <FiChevronRight className={`asset-category-filter-arrow ${open ? "open" : ""}`} />
        ) : (
          <span className="asset-category-filter-spacer" />
        )}
        <span className="asset-category-filter-copy">
          <strong>{node.name}</strong>
          <small>{node.code}</small>
        </span>
        <span className="asset-category-filter-count">{count}</span>
      </button>

      {hasChildren && open && (
        <div className="asset-category-filter-children">
          {node.children.map((child) => (
            <AssetCategoryFilterNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              selectedPathIds={selectedPathIds}
              expandedIds={expandedIds}
              assetCounts={assetCounts}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, total);

  return (
    <div className="table-pagination asset-list-pagination">
      <div className="table-pagination-summary">
        Hiển thị{" "}
        <strong>
          {start}-{end}
        </strong>{" "}
        / <strong>{total}</strong> tài sản
      </div>
      <div className="table-pagination-controls">
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          aria-label="Số dòng mỗi trang"
        >
          {[10, 20, 50, 100].map((option) => (
            <option key={option} value={option}>
              {option}/trang
            </option>
          ))}
        </select>
        <button type="button" onClick={() => onPageChange(1)} disabled={safePage <= 1}>
          <FiChevronsLeft />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
        >
          <FiChevronLeft />
        </button>
        <span>
          {safePage} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, safePage + 1))}
          disabled={safePage >= pageCount}
        >
          <FiChevronRight />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(pageCount)}
          disabled={safePage >= pageCount}
        >
          <FiChevronsRight />
        </button>
      </div>
    </div>
  );
}

function cellText(value: SheetCell): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

function readText(row: SheetRow, index: number): string {
  if (index < 0) return "";
  return cellText(row[index]);
}

function readNumber(row: SheetRow, index: number): number | null {
  const raw = row[index];
  if (typeof raw === "number") return raw;
  const value = cellText(raw);
  if (!value) return null;
  const cleaned = value.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/\.(?=\d{3}(\D|$))/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function readInteger(row: SheetRow, index: number): number | null {
  const parsed = readNumber(row, index);
  return parsed === null ? null : Math.trunc(parsed);
}

function readDate(row: SheetRow, index: number): string | undefined {
  const raw = row[index];
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  if (typeof raw === "number") {
    const date = new Date(Date.UTC(1899, 11, 30) + raw * 86400000);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
  }
  const value = cellText(raw);
  if (!value) return undefined;
  const iso = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const vi = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (vi) {
    const [, day, month, year] = vi;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return value;
}

function normalizeAssetClass(
  value: string,
  referenceCodes: Map<string, string> = new Map(),
): string | undefined {
  const text = normalize(value);
  if (!text) return undefined;
  const referencedCode = referenceCodes.get(text);
  if (referencedCode === "FIXED_ASSET" || referencedCode === "TOOL_EQUIPMENT") {
    return referencedCode;
  }
  if (text.includes("ccdc") || text.includes("cong cu")) return "TOOL_EQUIPMENT";
  if (text.includes("tscd") || text.includes("tai san co dinh")) return "FIXED_ASSET";
  const upper = value.trim().toUpperCase();
  if (upper === "FIX_ASSET") return "FIXED_ASSET";
  if (upper === "FIXED_ASSET" || upper === "TOOL_EQUIPMENT") return upper;
  return value.trim();
}

function normalizeClassType(
  value: string,
  referenceCodes: Map<string, string> = new Map(),
): string | undefined {
  const text = normalize(value);
  if (!text) return undefined;
  const referencedCode = referenceCodes.get(text);
  if (["TANGIBLE", "INTANGIBLE", "SINGLE_USE", "MULTI_USE"].includes(referencedCode ?? "")) {
    return referencedCode;
  }
  if (text.includes("vo hinh") || text.includes("intangible")) return "INTANGIBLE";
  if (text.includes("huu hinh") || text.includes("tangible")) return "TANGIBLE";
  if (text.includes("1 lan") || text.includes("mot lan") || text.includes("single")) {
    return "SINGLE_USE";
  }
  if (text.includes("nhieu lan") || text.includes("multi")) return "MULTI_USE";
  return value.trim().toUpperCase();
}

function normalizeStatus(value: string): string | undefined {
  const text = normalize(value);
  if (!text) return undefined;
  if (text.includes("trong kho")) return "IN_STOCK";
  if (text.includes("cap phat") || text.includes("dang su dung")) return "ASSIGNED";
  if (text.includes("bao tri")) return "MAINTENANCE";
  if (text.includes("thanh ly")) return "DISPOSED";
  if (text.includes("mat")) return "LOST";
  return value.trim().toUpperCase();
}

function extractCategoryCode(value: string): string | undefined {
  const codeInParentheses = value.match(/\(([A-Z0-9_]+)\)\s*$/i)?.[1];
  if (codeInParentheses) return codeInParentheses.toUpperCase();
  const code = value.split("(")[0].trim().split(/\s+/)[0];
  return code || undefined;
}

async function parseAssetImportFile(file: File): Promise<AssetImportRowPayload[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
  const referenceCodes = new Map<string, string>();
  const referenceSheetName = workbook.SheetNames.find(
    (name) => normalize(name) === normalize(CATEGORY_REFERENCE_SHEET_NAME),
  );
  if (referenceSheetName) {
    const referenceRows = XLSX.utils.sheet_to_json<SheetRow>(workbook.Sheets[referenceSheetName], {
      header: 1,
      defval: "",
      raw: true,
    });
    const referenceHeaderIndex = referenceRows.findIndex((row) => {
      const values = row.map((cell) => normalize(cellText(cell)));
      return values.some((value) => value.startsWith("ma/gia tri")) && values.includes("dien giai");
    });
    if (referenceHeaderIndex >= 0) {
      const referenceHeaders = referenceRows[referenceHeaderIndex].map((cell) =>
        normalize(cellText(cell)),
      );
      const codeIndex = referenceHeaders.findIndex((header) => header.startsWith("ma/gia tri"));
      const labelIndex = referenceHeaders.indexOf("dien giai");
      referenceRows.slice(referenceHeaderIndex + 1).forEach((row) => {
        const code = readText(row, codeIndex).toUpperCase();
        const label = normalize(readText(row, labelIndex));
        if (code && label) referenceCodes.set(label, code);
      });
    }
  }
  const sheetName = workbook.SheetNames.find((name) => normalize(name) === "thiet bi");
  if (!sheetName) throw new Error("Không tìm thấy sheet Thiết bị.");

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
    header: 1,
    blankrows: true,
    defval: "",
    raw: true,
  });
  const headerRowIndex = rows.findIndex((row) => {
    const headers = row.map((cell) => normalize(cellText(cell)));
    return headers.includes("ten thiet bi") && headers.includes("so luong");
  });
  if (headerRowIndex < 0) {
    throw new Error("Không tìm thấy hàng tiêu đề Tên thiết bị/Số lượng trong sheet Thiết bị.");
  }

  const headers = rows[headerRowIndex].map((cell) => normalize(cellText(cell)));
  const findColumn = (prefix: string) => headers.findIndex((header) => header.startsWith(prefix));
  const assetCodeIndex = findColumn("ma thiet bi");
  const nameIndex = findColumn("ten thiet bi");
  const technicalDescriptionIndex = findColumn("thong so ky thuat");
  const assetClassIndex = findColumn("phan loai tscd/ccdc");
  const classTypeIndex = findColumn("phan loai lop con");
  const categoryIndex = findColumn("loai");
  const modelIndex = findColumn("model");
  const serialIndex = findColumn("so seri");
  const siteIndex = findColumn("vi tri lap dat");
  const departmentIndex = findColumn("phong ban su dung");
  const countryIndex = findColumn("nuoc sx");
  const purchaseDateIndex = findColumn("ngay mua");
  const quantityIndex = findColumn("so luong");
  const unitPriceIndex = findColumn("don gia");
  const usefulLifeYearsIndex = findColumn("thoi gian kh");
  const statusIndex = findColumn("tinh trang");
  const contractNumberIndex = findColumn("ma hop dong");
  const invoiceNumberIndex = findColumn("so hoa don");
  const expandMergedColumn = (columnIndex: number) => {
    if (columnIndex < 0) return;
    const merges = sheet["!merges"] ?? [];
    for (const merge of merges) {
      if (columnIndex < merge.s.c || columnIndex > merge.e.c) continue;
      const anchor = sheet[XLSX.utils.encode_cell(merge.s)];
      if (!anchor) continue;
      const value = anchor?.v as SheetCell;
      for (let rowIndex = merge.s.r; rowIndex <= merge.e.r; rowIndex += 1) {
        sheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })] = { ...anchor, v: value };
        const row = rows[rowIndex] ?? [];
        row[columnIndex] = value;
        rows[rowIndex] = row;
      }
    }
    sheet["!merges"] = merges.filter((merge) => columnIndex < merge.s.c || columnIndex > merge.e.c);
  };
  expandMergedColumn(contractNumberIndex);
  expandMergedColumn(invoiceNumberIndex);

  const parsedRows: AssetImportRowPayload[] = [];
  const dataStartIndex = headerRowIndex + 1;
  let lastContractNumber = "";
  let lastInvoiceNumber = "";
  for (let index = dataStartIndex; index < rows.length; index += 1) {
    const row = rows[index];
    const assetClass = normalizeAssetClass(readText(row, assetClassIndex), referenceCodes);
    const name = readText(row, nameIndex);
    const categoryCode = extractCategoryCode(readText(row, categoryIndex));
    const model = readText(row, modelIndex);
    const specification = readText(row, technicalDescriptionIndex);
    const technicalDescription = [model ? `Model: ${model}` : "", specification]
      .filter(Boolean)
      .join("\n");
    const hasData = Boolean(
      name ||
        assetClass ||
        categoryCode ||
        readText(row, classTypeIndex) ||
        readText(row, assetCodeIndex),
    );
    if (!hasData) {
      if (parsedRows.length > 0) break;
      continue;
    }

    const contractNumber = readText(row, contractNumberIndex);
    const invoiceNumber = readText(row, invoiceNumberIndex);
    if (contractNumber) lastContractNumber = contractNumber;
    if (invoiceNumber) lastInvoiceNumber = invoiceNumber;

    parsedRows.push({
      rowNumber: index + 1,
      quantity: readInteger(row, quantityIndex) ?? 1,
      assetCode: readText(row, assetCodeIndex) || undefined,
      contractNumber: contractNumber || lastContractNumber || undefined,
      invoiceNumber: invoiceNumber || lastInvoiceNumber || undefined,
      name: name || undefined,
      assetClass,
      classType: normalizeClassType(readText(row, classTypeIndex), referenceCodes),
      categoryCode,
      departmentName: readText(row, departmentIndex) || undefined,
      siteName: readText(row, siteIndex) || undefined,
      serialNumber: readText(row, serialIndex) || undefined,
      purchaseDate: readDate(row, purchaseDateIndex),
      usefulLifeMonths: (() => {
        const years = readNumber(row, usefulLifeYearsIndex);
        return years === null ? null : Math.round(years * 12);
      })(),
      originalCost: readNumber(row, unitPriceIndex),
      status: normalizeStatus(readText(row, statusIndex)),
      countryCode: readText(row, countryIndex) || undefined,
      technicalDescription: technicalDescription || undefined,
    });
  }

  if (parsedRows.length === 0) throw new Error("Không tìm thấy dòng tài sản nào để import.");
  return parsedRows;
}

function downloadImportCsv(
  result: AssetImportValidationResponse,
  sourceRows: AssetImportRowPayload[],
) {
  const header = [
    "Dong Excel",
    "Trang thai",
    "Ten tai san",
    "So luong",
    "Ma hop dong",
    "So hoa don",
    "Danh muc",
    "Ma tai san du kien",
    "Loi",
    "Canh bao",
  ];
  const escapeCsvCell = (value: string | number | null | undefined) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [
    header.map(escapeCsvCell).join(","),
    ...result.rows.map((row) => {
      const source = sourceRows.find((item) => item.rowNumber === row.rowNumber);
      return [
        row.rowNumber,
        row.status,
        row.assetName,
        source?.quantity ?? 1,
        source?.contractNumber,
        source?.invoiceNumber,
        row.categoryCode,
        row.generatedAssetCodePreview,
        row.errors.map((item) => `${item.code}: ${item.message}`).join("; "),
        row.warnings.map((item) => `${item.code}: ${item.message}`).join("; "),
      ]
        .map(escapeCsvCell)
        .join(",");
    }),
  ];
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ket-qua-import-tai-san.csv";
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadAssetImportTemplate(categories: AssetCategoryTree[]) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BIMLab QLVT";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Thiết bị", {
    views: [{ state: "frozen", ySplit: 4 }],
  });
  sheet.properties.defaultRowHeight = 22;

  const headers = [
    "STT",
    "Mã thiết bị",
    "Mã hợp đồng",
    "Số hóa đơn",
    "Tên thiết bị",
    "Thông số kỹ thuật",
    "Phân loại TSCĐ/CCDC\n- TSCĐ: FIXED_ASSET\n- CCDC: TOOL_EQUIPMENT",
    "Phân loại lớp con\n- Nếu là TSCĐ: TANGIBLE / INTANGIBLE\n- Nếu là CCDC: SINGLE_USE / MULTI_USE",
    "Loại\n- Nhập mã loại tài sản node lá",
    "Model",
    "Số seri",
    "Vị trí lắp đặt",
    "Phòng ban sử dụng",
    "Nhà cung cấp",
    "Nước SX",
    "Ngày mua",
    "Số lượng",
    "Đơn giá (Chưa VAT)",
    "Nguyên giá (VNĐ)",
    "Thuế VAT",
    "Thời gian bảo hành (tháng)",
    "Thời gian KH (năm)",
    "Tình trạng",
    "Người quản lý",
    "Ghi chú",
    "Đã nhập nhà cung cấp",
  ];
  sheet.addRow(["DANH MỤC THIẾT BỊ"]);
  sheet.addRow([
    "Mỗi dòng là một nhóm tài sản cùng thông tin; hệ thống chỉ bung theo Số lượng khi xác nhận import và tự sinh mã riêng cho từng tài sản. Cột Nhà cung cấp và Đã nhập nhà cung cấp chỉ để đối chiếu, không được nhập vào hệ thống.",
  ]);
  sheet.addRow([]);
  sheet.addRow(headers);
  sheet.addRow([]);

  sheet.mergeCells("A1:Z1");
  const noteCell = sheet.getCell("A1");
  noteCell.font = { name: "Calibri", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  noteCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF154D7C" } };
  noteCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 34;

  sheet.mergeCells("A2:Z2");
  sheet.getCell("A2").font = { name: "Calibri", size: 13, color: { argb: "FF154D7C" } };
  sheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
  sheet.getCell("A2").alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(2).height = 30;

  sheet.getRow(4).height = 64;
  sheet.getRow(4).eachCell((cell) => {
    cell.font = { name: "Calibri", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF154D7C" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF154D7C" } },
      left: { style: "thin", color: { argb: "FF93C5FD" } },
      bottom: { style: "thin", color: { argb: "FF154D7C" } },
      right: { style: "thin", color: { argb: "FF93C5FD" } },
    };
  });

  const widths = [
    8, 18, 20, 16, 30, 38, 24, 26, 22, 18, 18, 20, 22, 26, 14, 16, 12, 20, 20, 14, 20, 18, 18, 20,
    30, 22,
  ];
  widths.forEach((width, index) => {
    const longestLine = [headers[index]]
      .flatMap((value) => String(value ?? "").split("\n"))
      .reduce((longest, line) => Math.max(longest, line.length), 0);
    sheet.getColumn(index + 1).width = Math.min(42, Math.max(width, longestLine + 2));
  });

  for (let rowIndex = 5; rowIndex <= 1000; rowIndex += 1) {
    for (let columnIndex = 1; columnIndex <= headers.length; columnIndex += 1) {
      const cell = sheet.getCell(rowIndex, columnIndex);
      cell.alignment = { ...cell.alignment, vertical: "top", wrapText: true };
      cell.font = { ...cell.font, name: "Calibri", size: 13 };
      cell.protection = { locked: false };
    }
    sheet.getCell(`P${rowIndex}`).numFmt = "dd/mm/yyyy";
    sheet.getCell(`W${rowIndex}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"IN_STOCK,ASSIGNED,MAINTENANCE,DISPOSED,LOST,PENDING"'],
    };
    for (const [column, color] of Object.entries({
      G: "FFF8FBFF",
      H: "FFF8FCF9",
      I: "FFFFFDF5",
    })) {
      const cell = sheet.getCell(`${column}${rowIndex}`);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFDDE3EA" } },
        left: { style: "thin", color: { argb: "FFDDE3EA" } },
        bottom: { style: "thin", color: { argb: "FFDDE3EA" } },
        right: { style: "thin", color: { argb: "FFDDE3EA" } },
      };
    }
  }

  const pasteSafeBorder = {
    top: { style: "thin" as const, color: { argb: "FFDDE3EA" } },
    left: { style: "thin" as const, color: { argb: "FFDDE3EA" } },
    bottom: { style: "thin" as const, color: { argb: "FFDDE3EA" } },
    right: { style: "thin" as const, color: { argb: "FFDDE3EA" } },
  };
  sheet.addConditionalFormatting({
    ref: "A5:Z1000",
    rules: [
      {
        type: "expression",
        formulae: ["1=1"],
        priority: 4,
        style: {
          font: { name: "Calibri", size: 13 },
          alignment: { vertical: "top", wrapText: true },
          border: pasteSafeBorder,
        },
      },
    ],
  });
  Object.entries({ G: "FFF8FBFF", H: "FFF8FCF9", I: "FFFFFDF5" }).forEach(
    ([column, color], index) => {
      sheet.addConditionalFormatting({
        ref: `${column}5:${column}1000`,
        rules: [
          {
            type: "expression",
            formulae: ["1=1"],
            priority: index + 1,
            style: {
              fill: { type: "pattern", pattern: "solid", bgColor: { argb: color } },
              border: pasteSafeBorder,
            },
          },
        ],
      });
    },
  );

  sheet.autoFilter = "A4:Z4";
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.font = { ...cell.font, name: "Calibri", size: 13 };
    });
  });

  addCategoryReferenceSheet(workbook, { categories });
  addHierarchicalCategorySheet(workbook, categories);
  addAssetCategoryDropdowns(workbook, sheet, categories);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mau_import_thiet_bi_bimlab_v2.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function AssetsPage() {
  const { hasPermission } = useAuth();
  const {
    assets,
    vendors,
    employees,
    departments,
    workSites,
    projects,
    ensureAssets,
    ensureAssetDetailLookups,
  } = useAppData();
  const { openModal } = useActions();
  const [query, setQuery] = useState("");
  const [catalogViewFilter, setCatalogViewFilter] =
    useState<CatalogViewFilter>(readCatalogViewFilter);
  const [statusFilter, setStatusFilter] = useState<AssetStatusFilter>("ALL");
  const [categoryPath, setCategoryPath] = useState<string[]>([]);
  const [expandedAssetCategoryIds, setExpandedAssetCategoryIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [categoryTree, setCategoryTree] = useState<AssetCategoryTree[]>([]);
  const [siteFilter, setSiteFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [useDateFrom, setUseDateFrom] = useState("");
  const [useDateTo, setUseDateTo] = useState("");
  const [valueFilter, setValueFilter] = useState<AssetValueFilter>("ALL");
  const [assetPage, setAssetPage] = useState(1);
  const [assetPageSize, setAssetPageSize] = useState(20);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [bulkActionBusy, setBulkActionBusy] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<number>>(() => new Set());
  const [assetMultiSelectMode, setAssetMultiSelectMode] = useState(false);
  const [assetCategoryCollapsed, setAssetCategoryCollapsed] = useState(false);
  const [bulkPanelAction, setBulkPanelAction] = useState<AssetBulkAction>(null);
  const [bulkStatus, setBulkStatus] = useState<(typeof ASSET_MUTABLE_STATUSES)[number]>("IN_STOCK");
  const [bulkSiteId, setBulkSiteId] = useState("");
  const [bulkDepartmentId, setBulkDepartmentId] = useState("");
  const [bulkEmployeeId, setBulkEmployeeId] = useState("");
  const [bulkCatalogItemId, setBulkCatalogItemId] = useState("");
  const [bulkNewCatalogName, setBulkNewCatalogName] = useState("");
  const [bulkCatalogMode, setBulkCatalogMode] = useState<BulkCatalogMode>("existing");
  const [catalogItems, setCatalogItems] = useState<AssetCatalogItemListItem[] | null>(null);
  const [assetColumnOrder, setAssetColumnOrder] = useState<AssetTableColumnId[]>(
    () => readAssetColumnPreferences().order,
  );
  const [visibleAssetColumns, setVisibleAssetColumns] = useState<AssetTableColumnId[]>(
    () => readAssetColumnPreferences().visible,
  );
  const [columnConfigOpen, setColumnConfigOpen] = useState(false);
  const [draggedAssetColumn, setDraggedAssetColumn] = useState<AssetTableColumnId | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [assetDraft, setAssetDraft] = useState<AssetPayload | null>(null);
  const [assetSaving, setAssetSaving] = useState(false);
  const [assetDetailView, setAssetDetailView] = useState<AssetDetailView>("details");
  const [assetChangeHistory, setAssetChangeHistory] = useState<AssetChangeLog[]>([]);
  const [assetHistoryLoading, setAssetHistoryLoading] = useState(false);
  const [assetHistoryError, setAssetHistoryError] = useState("");
  const [qrAsset, setQrAsset] = useState<AssetItem | null>(null);
  const [qrCode, setQrCode] = useState<AssetQrCode | null>(null);
  const [qrSvg, setQrSvg] = useState("");
  const [qrBusy, setQrBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importCancelConfirm, setImportCancelConfirm] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importRows, setImportRows] = useState<AssetImportRowPayload[]>([]);
  const [importResult, setImportResult] = useState<AssetImportValidationResponse | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("VALID_ROWS_ONLY");
  const [importPreviewFilter, setImportPreviewFilter] = useState<ImportPreviewFilter>("ALL");
  const [importTooltip, setImportTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    void ensureAssets();
  }, [ensureAssets]);

  useEffect(() => {
    loadAssetCategoryTree()
      .then(setCategoryTree)
      .catch(() => setCategoryTree([]));
  }, []);

  useEffect(() => {
    loadAssetCatalogItems()
      .then(setCatalogItems)
      .catch((error) =>
        toast.error(readError(error, "Không tải được danh sách danh mục tài sản.")),
      );
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      ASSET_TABLE_STORAGE_KEY,
      JSON.stringify({
        order: assetColumnOrder,
        visible: visibleAssetColumns,
      }),
    );
  }, [assetColumnOrder, visibleAssetColumns]);

  const canManage = hasPermission("asset_manage");
  const employeeName = (id?: number | null) =>
    id ? employeeLabel(employees.find((employee) => employee.id === id)) : "Chưa gán người dùng";
  const departmentName = (id?: number) =>
    id ? departments.find((department) => department.id === id)?.name || `Phòng ban #${id}` : "--";
  const siteName = (id?: number | null) =>
    id ? workSites.find((site) => site.id === id)?.name || `Site #${id}` : "BIMLAB";
  const projectName = (id?: number) =>
    id ? projectLabel(projects.find((project) => project.id === id)) : "--";

  const categoryDescendantIds = useMemo(() => {
    const idsByCategory = new Map<number, Set<number>>();
    const visit = (node: AssetCategoryTree): Set<number> => {
      const ids = new Set<number>([node.id]);
      node.children.forEach((child) => {
        visit(child).forEach((id) => {
          ids.add(id);
        });
      });
      idsByCategory.set(node.id, ids);
      return ids;
    };
    categoryTree.forEach(visit);
    return idsByCategory;
  }, [categoryTree]);

  const categoryDescendantCodes = useMemo(() => {
    const codesByCategory = new Map<number, Set<string>>();
    const visit = (node: AssetCategoryTree): Set<string> => {
      const codes = new Set<string>();
      if (node.code) codes.add(node.code);
      node.children.forEach((child) => {
        visit(child).forEach((code) => {
          codes.add(code);
        });
      });
      codesByCategory.set(node.id, codes);
      return codes;
    };
    categoryTree.forEach(visit);
    return codesByCategory;
  }, [categoryTree]);

  const categoryAssetCounts = useMemo(() => {
    const counts = new Map<number, number>();
    const visit = (node: AssetCategoryTree) => {
      const descendantIds = categoryDescendantIds.get(node.id) ?? collectCategoryIds(node);
      const descendantCodes = categoryDescendantCodes.get(node.id) ?? collectCategoryCodes(node);
      const count = assets.filter((asset) =>
        assetMatchesCategoryNode(asset, node, descendantIds, descendantCodes),
      ).length;
      counts.set(node.id, count);
      node.children.forEach(visit);
    };
    categoryTree.forEach(visit);
    return counts;
  }, [assets, categoryDescendantIds, categoryDescendantCodes, categoryTree]);

  const clearCatalogViewFilter = () => {
    setCatalogViewFilter({ id: null, name: "" });
    const url = new URL(window.location.href);
    url.searchParams.delete("catalogItemId");
    url.searchParams.delete("catalogName");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const resetAssetFilters = () => {
    setCategoryPath([]);
    setExpandedAssetCategoryIds(new Set());
    setStatusFilter("ALL");
    setSiteFilter("ALL");
    setDepartmentFilter("ALL");
    setEmployeeFilter("ALL");
    setSourceFilter("ALL");
    setUseDateFrom("");
    setUseDateTo("");
    setValueFilter("ALL");
    clearCatalogViewFilter();
    setAssetPage(1);
  };

  const selectedCategoryNodes = useMemo(
    () => findCategoryPath(categoryTree, categoryPath),
    [categoryPath, categoryTree],
  );
  const selectedCategoryPathIds = useMemo(
    () => new Set(selectedCategoryNodes.map((node) => node.id)),
    [selectedCategoryNodes],
  );

  const selectedCategoryNode = selectedCategoryNodes.at(-1) ?? null;

  const assetDraftChanged = useMemo(() => {
    if (!selectedAsset || !assetDraft) return false;
    return JSON.stringify(assetDraft) !== JSON.stringify(buildAssetPayload(selectedAsset));
  }, [assetDraft, selectedAsset]);

  const siteOptions = useMemo(
    () =>
      Array.from(new Set(assets.map((asset) => asset.siteId).filter(Boolean) as number[])).sort(
        (a, b) => siteName(a).localeCompare(siteName(b), "vi"),
      ),
    [assets, workSites],
  );

  const departmentOptions = useMemo(() => {
    const ids = new Set<number>();
    assets.forEach((asset) => {
      if (siteFilter !== "ALL" && asset.siteId !== Number(siteFilter)) return;
      if (asset.departmentId) ids.add(asset.departmentId);
    });
    return Array.from(ids).sort((a, b) => departmentName(a).localeCompare(departmentName(b), "vi"));
  }, [assets, departments, siteFilter]);

  const employeeOptions = useMemo(() => {
    const ids = new Set<number>();
    assets.forEach((asset) => {
      if (siteFilter !== "ALL" && asset.siteId !== Number(siteFilter)) return;
      if (departmentFilter !== "ALL" && asset.departmentId !== Number(departmentFilter)) return;
      if (asset.assignedEmployeeId) ids.add(asset.assignedEmployeeId);
    });
    return Array.from(ids).sort((a, b) => employeeName(a).localeCompare(employeeName(b), "vi"));
  }, [assets, departmentFilter, employees, siteFilter]);

  const sourceOptions = useMemo(
    () =>
      Array.from(
        new Set(assets.map((asset) => asset.source?.trim()).filter(Boolean) as string[]),
      ).sort((a, b) => a.localeCompare(b, "vi")),
    [assets],
  );

  useEffect(() => {
    if (departmentFilter === "ALL") return;
    if (!departmentOptions.includes(Number(departmentFilter))) {
      setDepartmentFilter("ALL");
      setEmployeeFilter("ALL");
    }
  }, [departmentFilter, departmentOptions]);

  useEffect(() => {
    if (employeeFilter === "ALL") return;
    if (!employeeOptions.includes(Number(employeeFilter))) {
      setEmployeeFilter("ALL");
    }
  }, [employeeFilter, employeeOptions]);

  useEffect(() => {
    if (useDateFrom && useDateTo && useDateFrom > useDateTo) {
      setUseDateTo("");
    }
  }, [useDateFrom, useDateTo]);

  const filteredAssets = useMemo(() => {
    const normalized = query
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const valueRange = ASSET_VALUE_FILTERS.find((item) => item.value === valueFilter);
    const selectedCategoryIds = selectedCategoryNode
      ? (categoryDescendantIds.get(selectedCategoryNode.id) ??
        collectCategoryIds(selectedCategoryNode))
      : null;
    const selectedCategoryCodes = selectedCategoryNode
      ? (categoryDescendantCodes.get(selectedCategoryNode.id) ??
        collectCategoryCodes(selectedCategoryNode))
      : null;
    return assets.filter((asset) => {
      const matchesStatus = statusFilter === "ALL" || asset.status === statusFilter;
      const assetCategoryId = asset.assetCategory?.id;
      const assetCategoryCode = asset.category || asset.assetCategory?.code;
      const matchesCategory =
        !selectedCategoryNode ||
        (assetCategoryId && selectedCategoryIds?.has(assetCategoryId)) ||
        (assetCategoryCode && selectedCategoryCodes?.has(assetCategoryCode)) ||
        assetMatchesCategoryNode(
          asset,
          selectedCategoryNode,
          selectedCategoryIds,
          selectedCategoryCodes,
        );
      const matchesSite = siteFilter === "ALL" || asset.siteId === Number(siteFilter);
      const matchesDepartment =
        departmentFilter === "ALL" || asset.departmentId === Number(departmentFilter);
      const matchesEmployee =
        employeeFilter === "ALL" || asset.assignedEmployeeId === Number(employeeFilter);
      const matchesSource = sourceFilter === "ALL" || asset.source?.trim() === sourceFilter;
      const matchesCatalog =
        catalogViewFilter.id === null || asset.catalogItem?.id === catalogViewFilter.id;
      const assetUseDate = dateKey(asset.useDate);
      const matchesUseDateFrom = !useDateFrom || (assetUseDate && assetUseDate >= useDateFrom);
      const matchesUseDateTo = !useDateTo || (assetUseDate && assetUseDate <= useDateTo);
      const cost = Number(asset.purchaseCost || 0);
      const matchesValue =
        valueFilter === "ALL" ||
        Boolean(
          valueRange &&
            (valueRange.min === undefined || cost >= valueRange.min) &&
            (valueRange.max === undefined || cost < valueRange.max),
        );
      const searchable = [
        asset.assetCode,
        asset.name,
        asset.category,
        asset.assetCategory?.name,
        asset.assetCategory?.code,
        asset.catalogItem?.name,
        asset.catalogItem?.itemCode,
        asset.serialNumber,
        asset.contractNumber,
        asset.invoiceNumber,
        asset.vendor?.name,
        employeeName(asset.assignedEmployeeId),
        departmentName(asset.departmentId),
        siteName(asset.siteId),
        projectName(asset.projectId),
      ]
        .filter(Boolean)
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      const matchesQuery = !normalized || searchable.includes(normalized);
      return (
        matchesStatus &&
        matchesCategory &&
        matchesSite &&
        matchesDepartment &&
        matchesEmployee &&
        matchesSource &&
        matchesCatalog &&
        matchesUseDateFrom &&
        matchesUseDateTo &&
        matchesValue &&
        matchesQuery
      );
    });
  }, [
    assets,
    categoryDescendantIds,
    categoryDescendantCodes,
    catalogViewFilter.id,
    departments,
    employees,
    projects,
    query,
    selectedCategoryNode,
    departmentFilter,
    employeeFilter,
    siteFilter,
    sourceFilter,
    statusFilter,
    useDateFrom,
    useDateTo,
    valueFilter,
    workSites,
  ]);

  useEffect(() => {
    setAssetPage(1);
  }, [
    categoryPath,
    departmentFilter,
    employeeFilter,
    query,
    siteFilter,
    sourceFilter,
    statusFilter,
    useDateFrom,
    useDateTo,
    valueFilter,
  ]);

  const assetPageCount = Math.max(1, Math.ceil(filteredAssets.length / assetPageSize));
  const safeAssetPage = Math.min(assetPage, assetPageCount);
  const pagedAssets = useMemo(
    () => filteredAssets.slice((safeAssetPage - 1) * assetPageSize, safeAssetPage * assetPageSize),
    [assetPageSize, filteredAssets, safeAssetPage],
  );
  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedAssetIds.has(asset.id)),
    [assets, selectedAssetIds],
  );
  const pageSelectableIds = useMemo(() => pagedAssets.map((asset) => asset.id), [pagedAssets]);
  const selectedOnPageCount = useMemo(
    () => pageSelectableIds.filter((id) => selectedAssetIds.has(id)).length,
    [pageSelectableIds, selectedAssetIds],
  );
  const allPageSelected =
    pageSelectableIds.length > 0 && selectedOnPageCount === pageSelectableIds.length;
  const somePageSelected = selectedOnPageCount > 0 && !allPageSelected;
  const selectedAssetsValue = useMemo(
    () => selectedAssets.reduce((sum, asset) => sum + Number(asset.purchaseCost || 0), 0),
    [selectedAssets],
  );
  const selectedAssetCategory = selectedAssets[0]?.assetCategory ?? null;
  const selectedCategoryId = selectedAssetCategory?.id ?? null;
  const selectedAssetsShareName =
    selectedAssets.length > 0 &&
    selectedAssets.every((asset) => normalize(asset.name) === normalize(selectedAssets[0].name));
  const selectedAssetsShareCategory =
    selectedCategoryId !== null &&
    selectedAssets.every((asset) => asset.assetCategory?.id === selectedCategoryId);
  const catalogAssignmentDisabled = !selectedAssetsShareName || !selectedAssetsShareCategory;
  const selectedAssetName = normalize(selectedAssets[0]?.name || "");
  const sameNameCategoryAssets = assets.filter(
    (asset) =>
      selectedAssetName !== "" &&
      normalize(asset.name) === selectedAssetName &&
      asset.assetCategory?.id === selectedCategoryId,
  );
  const canSelectSameNameAssets =
    !catalogAssignmentDisabled && sameNameCategoryAssets.length > selectedAssets.length;
  const selectedBulkCatalogType = catalogTypeForAssetClass(selectedAssetCategory?.assetClass);
  const compatibleBulkCatalogItems = (catalogItems || []).filter(
    (item) => item.active && item.categoryId === selectedCategoryId,
  );
  const catalogAssignmentLabelById = useMemo(
    () => new Map((catalogItems || []).map((item) => [item.id, catalogAssignmentLabel(item)])),
    [catalogItems],
  );
  const selectedBulkCatalogIds = new Set(
    selectedAssets
      .map((asset) => asset.catalogItem?.id)
      .filter((id): id is number => typeof id === "number"),
  );
  const selectedCurrentBulkCatalogId =
    selectedBulkCatalogIds.size === 1 ? String(Array.from(selectedBulkCatalogIds)[0]) : "";
  const selectedAssetsHaveCatalog = selectedBulkCatalogIds.size > 0;
  const selectedBulkCatalogGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        name: string;
        count: number;
        categoryLabel: string;
        catalogLabels: Set<string>;
      }
    >();
    selectedAssets.forEach((asset) => {
      const categoryLabel = asset.assetCategory
        ? `${asset.assetCategory.name} (${asset.assetCategory.code})`
        : asset.category || "Chưa có loại tài sản";
      const key = `${normalize(asset.name)}|${asset.assetCategory?.id || asset.category || ""}`;
      const current = groups.get(key);
      const catalogLabel = asset.catalogItem
        ? catalogAssignmentLabelById.get(asset.catalogItem.id) ||
          catalogAssignmentLabel(asset.catalogItem)
        : "Chưa gắn danh mục";
      if (current) {
        current.count += 1;
        current.catalogLabels.add(catalogLabel);
        return;
      }
      groups.set(key, {
        key,
        name: asset.name || "--",
        count: 1,
        categoryLabel,
        catalogLabels: new Set([catalogLabel]),
      });
    });
    return Array.from(groups.values()).map((group) => ({
      key: group.key,
      name: group.name,
      count: group.count,
      categoryLabel: group.categoryLabel,
      catalogLabel:
        group.catalogLabels.size === 1
          ? Array.from(group.catalogLabels)[0]
          : "Nhiều danh mục hiện tại",
    }));
  }, [catalogAssignmentLabelById, selectedAssets]);
  const selectableBulkCatalogItems = compatibleBulkCatalogItems.filter(
    (item) => !selectedBulkCatalogIds.has(item.id),
  );

  useEffect(() => {
    if (assetPage > assetPageCount) setAssetPage(assetPageCount);
  }, [assetPage, assetPageCount]);

  useEffect(() => {
    setSelectedAssetIds((current) => {
      if (current.size === 0) return current;
      const validIds = new Set(assets.map((asset) => asset.id));
      const next = new Set(Array.from(current).filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [assets]);

  useEffect(() => {
    if (selectedAssets.length === 0) {
      setBulkPanelAction(null);
      setBulkNewCatalogName("");
    }
  }, [selectedAssets.length]);

  const totalValue = useMemo(
    () => assets.reduce((sum, item) => sum + Number(item.purchaseCost || 0), 0),
    [assets],
  );

  const filteredValue = useMemo(
    () => filteredAssets.reduce((sum, item) => sum + Number(item.purchaseCost || 0), 0),
    [filteredAssets],
  );

  const assetListInsights = useMemo(() => {
    const countMap = (values: string[]) => {
      const map = new Map<string, number>();
      values.forEach((value) => {
        map.set(value, (map.get(value) || 0) + 1);
      });
      return Array.from(map.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "vi"))
        .slice(0, 5);
    };

    const valueBuckets = ASSET_VALUE_FILTERS.filter((item) => item.value !== "ALL")
      .map((bucket) => ({
        label: bucket.label,
        value: filteredAssets.filter((asset) => {
          const value = Number(asset.purchaseCost || 0);
          if (bucket.min !== undefined && value < bucket.min) return false;
          if (bucket.max !== undefined && value >= bucket.max) return false;
          return true;
        }).length,
      }))
      .filter((item) => item.value > 0);

    return {
      statuses: countMap(filteredAssets.map((asset) => statusLabel(asset.status))),
      categories: countMap(
        filteredAssets.map(
          (asset) => asset.assetCategory?.name || asset.category || "Chưa phân loại",
        ),
      ),
      values: valueBuckets,
      sites: countMap(filteredAssets.map((asset) => siteName(asset.siteId))),
    };
  }, [filteredAssets, workSites]);

  const importPreviewRows = useMemo(() => {
    const rows = importResult?.rows ?? importRows.slice(0, 30);
    if (!importResult || importPreviewFilter === "ALL") return rows;
    return rows.filter((row) => "errors" in row && row.status === importPreviewFilter);
  }, [importPreviewFilter, importResult, importRows]);

  const canCommitImport = Boolean(
    importResult &&
      importRows.length > 0 &&
      importResult.validRows > 0 &&
      (importMode === "VALID_ROWS_ONLY" || importResult.errorRows === 0),
  );

  const reloadAssetList = async () => {
    setListRefreshing(true);
    try {
      await ensureAssets(true, true);
    } finally {
      setListRefreshing(false);
    }
  };

  const toggleAssetCategory = (id: number) => {
    setExpandedAssetCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const ensureCatalogItems = async () => {
    if (catalogItems !== null) return;
    try {
      setCatalogItems(await loadAssetCatalogItems());
    } catch (error) {
      toast.error(readError(error, "Không tải được danh sách danh mục tài sản."));
    }
  };

  const openAssetDetail = (item: AssetItem) => {
    setSelectedAsset(item);
    setAssetDraft(buildAssetPayload(item));
    setAssetDetailView("details");
    setAssetChangeHistory([]);
    setAssetHistoryError("");
    void ensureAssetDetailLookups();
    void ensureCatalogItems();
  };

  const closeAssetDetail = () => {
    if (assetSaving) return;
    setSelectedAsset(null);
    setAssetDraft(null);
    setAssetDetailView("details");
  };

  const openAssetHistory = async () => {
    if (!selectedAsset || assetHistoryLoading) return;
    setAssetDetailView("history");
    setAssetHistoryLoading(true);
    setAssetHistoryError("");
    try {
      setAssetChangeHistory(await loadAssetChangeHistory(selectedAsset.id));
    } catch (error) {
      setAssetHistoryError(readError(error, "Không tải được lịch sử chỉnh sửa của tài sản."));
    } finally {
      setAssetHistoryLoading(false);
    }
  };

  const assetAuditValue = (field: string, value: unknown) => {
    if (value === null || value === undefined) {
      return (
        {
          assignedEmployeeId: "Chưa gán hoặc đã thu hồi về kho",
          departmentId: "Chưa gán phòng ban",
          siteId: "Chưa gán chi nhánh",
          projectId: "Chưa gán dự án",
          useDate: "Chưa xác định ngày sử dụng",
        }[field] || "Chưa có dữ liệu"
      );
    }
    if (value === "") return "Chưa có";
    const id = Number(value);
    if (field === "assignedEmployeeId") return employeeName(id);
    if (field === "departmentId") return departmentName(id);
    if (field === "siteId") return siteName(id);
    if (field === "projectId") return projectName(id);
    if (field === "useDate") {
      const parts = Array.isArray(value)
        ? value
        : String(value)
            .match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
            ?.slice(1);
      if (parts && parts.length >= 3) {
        return `${String(parts[2]).padStart(2, "0")}/${String(parts[1]).padStart(2, "0")}/${parts[0]}`;
      }
    }
    if (field === "status") {
      return (
        {
          IN_STOCK: "Trong kho",
          ASSIGNED: "Đang sử dụng",
          MAINTENANCE: "Bảo trì",
          DISPOSED: "Đã thanh lý",
        }[String(value)] || String(value)
      );
    }
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const updateAssetDraft = (field: keyof AssetPayload, value: AssetPayload[keyof AssetPayload]) => {
    setAssetDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSaveAsset = async () => {
    if (!selectedAsset || !assetDraft) return;
    setAssetSaving(true);
    try {
      await updateAsset(selectedAsset.id, {
        ...assetDraft,
        technicalDescription: richTextStorageValue(assetDraft.technicalDescription || ""),
        notes: richTextStorageValue(assetDraft.notes || ""),
      });
      toast.success("Đã cập nhật tài sản.");
      await reloadAssetList();
      setSelectedAsset(null);
      setAssetDraft(null);
    } catch (error) {
      toast.error(readError(error, "Không cập nhật được tài sản."));
    } finally {
      setAssetSaving(false);
    }
  };

  const handleDeleteAsset = async (item: AssetItem) => {
    const confirmed = window.confirm(`Xóa tài sản ${item.assetCode} - ${item.name}?`);
    if (!confirmed) return;
    try {
      await deleteAsset(item.id);
      toast.success("Đã xóa tài sản.");
      setSelectedAssetIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
      await reloadAssetList();
    } catch (error) {
      toast.error(readError(error, "Không xóa được tài sản."));
    }
  };

  const toggleAssetSelected = (id: number) => {
    setSelectedAssetIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCurrentPageSelected = () => {
    setSelectedAssetIds((current) => {
      const next = new Set(current);
      if (allPageSelected) {
        pageSelectableIds.forEach((id) => {
          next.delete(id);
        });
      } else {
        pageSelectableIds.forEach((id) => {
          next.add(id);
        });
      }
      return next;
    });
  };

  const clearSelectedAssets = () => {
    setSelectedAssetIds(new Set());
    setBulkPanelAction(null);
  };

  const handleSelectSameNameAssets = () => {
    setSelectedAssetIds(new Set(sameNameCategoryAssets.map((asset) => asset.id)));
    setBulkPanelAction(null);
    toast.success(
      `Đã chọn ${sameNameCategoryAssets.length} tài sản cùng tên và cùng loại trên toàn bộ danh sách.`,
    );
  };

  const handleBulkDeleteAssets = async () => {
    if (selectedAssets.length === 0 || bulkActionBusy) return;
    const confirmed = window.confirm(`Xóa ${selectedAssets.length} tài sản đã chọn?`);
    if (!confirmed) return;
    setBulkActionBusy(true);
    try {
      await Promise.all(selectedAssets.map((asset) => deleteAsset(asset.id)));
      toast.success(`Đã xóa ${selectedAssets.length} tài sản.`);
      clearSelectedAssets();
      await reloadAssetList();
    } catch (error) {
      toast.error(readError(error, "Không xóa được một số tài sản đã chọn."));
    } finally {
      setBulkActionBusy(false);
    }
  };

  const openBulkPanelAction = (action: AssetBulkAction) => {
    if (selectedAssets.length === 0) return;
    if (action === "qr") {
      setBulkPanelAction(null);
      void handlePrintQrBatch();
      return;
    }
    setBulkPanelAction((current) => (current === action ? null : action));
    if (action === "catalog") {
      setBulkCatalogItemId(selectedCurrentBulkCatalogId);
      setBulkNewCatalogName(selectedAssets[0]?.name || "");
      setBulkCatalogMode("existing");
      void ensureCatalogItems();
    }
    if (action === "move" || action === "assign") {
      void ensureAssetDetailLookups();
    }
  };

  const updateSelectedAssets = async (
    buildPayload: (asset: AssetItem) => AssetPayload,
    successMessage: string,
  ) => {
    if (selectedAssets.length === 0 || bulkActionBusy) return;
    const count = selectedAssets.length;
    setBulkActionBusy(true);
    try {
      await Promise.all(selectedAssets.map((asset) => updateAsset(asset.id, buildPayload(asset))));
      toast.success(successMessage);
      setBulkPanelAction(null);
      await reloadAssetList();
      setSelectedAssetIds((current) => {
        const next = new Set(current);
        selectedAssets.forEach((asset) => {
          next.delete(asset.id);
        });
        return next;
      });
    } catch (error) {
      toast.error(readError(error, `Không cập nhật được ${count} tài sản đã chọn.`));
    } finally {
      setBulkActionBusy(false);
    }
  };

  const handleBulkUpdateStatus = async () => {
    await updateSelectedAssets(
      (asset) => ({ ...buildAssetPayload(asset), status: bulkStatus }),
      `Đã cập nhật trạng thái ${selectedAssets.length} tài sản.`,
    );
  };

  const handleBulkAssignCatalog = async () => {
    if (!bulkCatalogItemId || catalogAssignmentDisabled) return;
    if (selectedAssetsHaveCatalog && bulkCatalogMode !== "change") {
      toast.error("Tài sản đã có danh mục, chỉ được đổi sang danh mục cùng mã loại.");
      return;
    }
    const catalogItemId = Number(bulkCatalogItemId);
    const selectedCatalogItem = (catalogItems || []).find((item) => item.id === catalogItemId);
    if (
      !selectedCatalogItem ||
      selectedCatalogItem.categoryId !== selectedCategoryId ||
      selectedCatalogItem.categoryCode !== selectedAssetCategory?.code
    ) {
      toast.error("Không thể gán danh mục khác mã loại.");
      return;
    }
    setBulkActionBusy(true);
    try {
      await assignAssetCatalog({
        assetIds: selectedAssets.map((asset) => asset.id),
        catalogItemId,
      });
      toast.success(
        bulkCatalogMode === "change"
          ? `Đã đổi danh mục cho ${selectedAssets.length} tài sản.`
          : `Đã gán danh mục cho ${selectedAssets.length} tài sản.`,
      );
      clearSelectedAssets();
      await reloadAssetList();
    } catch (error) {
      toast.error(readError(error, "Chưa thể gán danh mục cho các tài sản đã chọn."));
    } finally {
      setBulkActionBusy(false);
    }
  };

  const handleBulkCreateAndAssignCatalog = async () => {
    if (catalogAssignmentDisabled || !selectedAssetCategory) return;
    if (selectedAssetsHaveCatalog) {
      toast.error("Tài sản đã có danh mục, chỉ được đổi sang danh mục cùng mã loại.");
      return;
    }
    const name = bulkNewCatalogName.trim();
    if (!name) {
      toast.error("Nhập tên danh mục mới.");
      return;
    }

    setBulkActionBusy(true);
    try {
      const { createAssetCatalogItem } = await import("../services/api");
      const catalogItem = await createAssetCatalogItem({
        name,
        categoryId: selectedAssetCategory.id,
        catalogType: selectedBulkCatalogType,
        costValue: selectedAssets[0]?.purchaseCost ?? selectedAssets[0]?.originalCost ?? null,
        technicalSpec: richTextStorageValue(selectedAssets[0]?.technicalDescription || ""),
        active: true,
      });
      await assignAssetCatalog({
        assetIds: selectedAssets.map((asset) => asset.id),
        catalogItemId: catalogItem.id,
      });
      setCatalogItems((current) => (current ? [...current, catalogItem] : [catalogItem]));
      toast.success(`Đã tạo và gán danh mục cho ${selectedAssets.length} tài sản.`);
      clearSelectedAssets();
      await reloadAssetList();
    } catch (error) {
      toast.error(readError(error, "Chưa thể tạo danh mục cho các tài sản đã chọn."));
    } finally {
      setBulkActionBusy(false);
    }
  };

  const handleBulkMoveAssets = async () => {
    if (!bulkSiteId && !bulkDepartmentId && !bulkEmployeeId) {
      toast.error("Chọn ít nhất một thông tin vị trí hoặc người giữ cần cập nhật.");
      return;
    }
    await updateSelectedAssets(
      (asset) => ({
        ...buildAssetPayload(asset),
        siteId: bulkSiteId ? Number(bulkSiteId) : (asset.siteId ?? null),
        departmentId: bulkDepartmentId ? Number(bulkDepartmentId) : (asset.departmentId ?? null),
        assignedEmployeeId: bulkEmployeeId
          ? Number(bulkEmployeeId)
          : (asset.assignedEmployeeId ?? null),
      }),
      `Đã chuyển vị trí ${selectedAssets.length} tài sản.`,
    );
  };

  const handleBulkAssignAssets = async () => {
    if (!bulkEmployeeId) {
      toast.error("Chọn nhân sự nhận tài sản trước khi cấp phát.");
      return;
    }
    await updateSelectedAssets(
      (asset) => ({
        ...buildAssetPayload(asset),
        status: "ASSIGNED",
        siteId: bulkSiteId ? Number(bulkSiteId) : (asset.siteId ?? null),
        departmentId: bulkDepartmentId ? Number(bulkDepartmentId) : (asset.departmentId ?? null),
        assignedEmployeeId: Number(bulkEmployeeId),
      }),
      `Đã cấp phát ${selectedAssets.length} tài sản.`,
    );
  };

  const handleBulkReturnAssets = async () => {
    const confirmed = window.confirm(
      `Thu hồi ${selectedAssets.length} tài sản đã chọn về trạng thái trong kho?`,
    );
    if (!confirmed) return;
    await updateSelectedAssets(
      (asset) => ({
        ...buildAssetPayload(asset),
        status: "IN_STOCK",
        assignedEmployeeId: null,
      }),
      `Đã thu hồi ${selectedAssets.length} tài sản.`,
    );
  };

  const openAssetQr = async (asset: AssetItem) => {
    setQrAsset(asset);
    setQrCode(null);
    setQrSvg("");
    setQrBusy(true);
    try {
      const [issued] = await issueAssetQrCodes([asset.id]);
      if (!issued) throw new Error("Không tạo được mã QR");
      const svg = await QRCode.toString(issued.publicUrl, {
        type: "svg",
        errorCorrectionLevel: "M",
        margin: 1,
        width: 280,
      });
      setQrCode(issued);
      setQrSvg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    } catch (error) {
      setQrAsset(null);
      toast.error(readError(error, "Không tạo được mã QR tài sản."));
    } finally {
      setQrBusy(false);
    }
  };

  const closeAssetQr = () => {
    setQrAsset(null);
    setQrCode(null);
    setQrSvg("");
  };

  const handlePrintQrBatch = async () => {
    if (selectedAssets.length === 0 || bulkActionBusy) return;
    const printWindow = window.open("", "bimlab-asset-qr-print", "width=920,height=760");
    if (!printWindow) {
      toast.error("Trình duyệt đang chặn cửa sổ in.");
      return;
    }
    printWindow.document.write("<p>Đang chuẩn bị mã QR...</p>");
    setBulkActionBusy(true);
    try {
      const codes = await issueAssetQrCodes(selectedAssets.map((asset) => asset.id));
      await renderQrPrint(printWindow, codes);
      toast.success(`Đã chuẩn bị ${codes.length} mã QR để in.`);
    } catch (error) {
      printWindow.close();
      toast.error(readError(error, "Không chuẩn bị được danh sách mã QR."));
    } finally {
      setBulkActionBusy(false);
    }
  };

  const handlePrintCurrentQr = async () => {
    if (!qrCode) return;
    const printWindow = window.open("", "bimlab-asset-qr-print", "width=920,height=760");
    if (!printWindow) {
      toast.error("Trình duyệt đang chặn cửa sổ in.");
      return;
    }
    await renderQrPrint(printWindow, [qrCode]);
  };

  const toggleAssetColumn = (id: AssetTableColumnId) => {
    const column = ASSET_TABLE_COLUMNS.find((item) => item.id === id);
    if (column?.locked) return;
    setVisibleAssetColumns((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const resetAssetColumns = () => {
    setAssetColumnOrder(normalizeAssetColumnOrder(ASSET_TABLE_COLUMN_IDS));
    setVisibleAssetColumns(DEFAULT_ASSET_TABLE_VISIBLE_COLUMNS);
  };

  const dropAssetColumn = (targetId: AssetTableColumnId) => {
    if (!draggedAssetColumn || draggedAssetColumn === targetId) return;
    const draggedColumn = ASSET_TABLE_COLUMNS.find((item) => item.id === draggedAssetColumn);
    const targetColumn = ASSET_TABLE_COLUMNS.find((item) => item.id === targetId);
    if (draggedColumn?.locked || targetColumn?.locked) {
      setDraggedAssetColumn(null);
      return;
    }
    setAssetColumnOrder((current) => {
      const withoutDragged = current.filter((id) => id !== draggedAssetColumn);
      const targetIndex = withoutDragged.indexOf(targetId);
      if (targetIndex < 0) return current;
      return normalizeAssetColumnOrder([
        ...withoutDragged.slice(0, targetIndex),
        draggedAssetColumn,
        ...withoutDragged.slice(targetIndex),
      ]);
    });
    setDraggedAssetColumn(null);
  };

  const assetTableColumns: AssetTableColumnDefinition[] = [
    {
      id: "asset",
      label: "Tài sản",
      locked: true,
      render: (item) => (
        <div
          className="asset-name-cell"
          title={`${item.name} - ${item.assetCode}`}
          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          <strong style={{ overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
            {highlightSearchText(item.name, query)}
          </strong>
        </div>
      ),
    },
    {
      id: "category",
      label: "Loại",
      render: (item) => (
        <div
          className="asset-name-cell"
          title={item.assetCategory?.name || item.category || "Chưa phân loại"}
          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          <strong style={{ overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
            {highlightSearchText(
              item.assetCategory?.name || item.category || "Chưa phân loại",
              query,
            )}
          </strong>
        </div>
      ),
    },
    {
      id: "catalogName",
      label: "Tên danh mục",
      render: (item) => highlightSearchText(item.catalogItem?.name || "--", query),
    },
    {
      id: "catalogCode",
      label: "Mã danh mục",
      render: (item) => highlightSearchText(item.catalogItem?.itemCode || "--", query),
    },
    {
      id: "categoryCode",
      label: "Mã loại",
      render: (item) => highlightSearchText(item.assetCategory?.code || "--", query),
    },
    {
      id: "serialNumber",
      label: "Serial/MAC",
      render: (item) => highlightSearchText(item.serialNumber || "--", query),
    },
    {
      id: "contractNumber",
      label: "Số hợp đồng",
      render: (item) => highlightSearchText(item.contractNumber || "--", query),
    },
    {
      id: "invoiceNumber",
      label: "Số hóa đơn",
      render: (item) => highlightSearchText(item.invoiceNumber || "--", query),
    },
    {
      id: "status",
      label: "Trạng thái",
      render: (item) => statusLabel(item.status),
    },
    {
      id: "purchaseCost",
      label: "Giá trị mua",
      align: "right",
      render: (item) => money.format(Number(item.purchaseCost || 0)),
    },
    {
      id: "originalCost",
      label: "Nguyên giá",
      align: "right",
      render: (item) => money.format(Number(item.originalCost || 0)),
    },
    {
      id: "bookValue",
      label: "Giá trị còn lại",
      align: "right",
      render: (item) => money.format(Number(item.bookValue || item.residualValue || 0)),
    },
    {
      id: "source",
      label: "Nguồn hình thành",
      render: (item) => item.source || "--",
    },
    {
      id: "site",
      label: "Chi nhánh",
      render: (item) => siteName(item.siteId),
    },
    {
      id: "department",
      label: "Phòng ban",
      render: (item) => departmentName(item.departmentId),
    },
    {
      id: "employee",
      label: "Người giữ",
      render: (item) => employeeName(item.assignedEmployeeId),
    },
    {
      id: "vendor",
      label: "Nhà cung cấp",
      render: (item) => item.vendor?.name || "--",
    },
    {
      id: "project",
      label: "Dự án",
      render: (item) => projectName(item.projectId),
    },
    {
      id: "purchaseDate",
      label: "Ngày mua",
      render: (item) => item.purchaseDate || "--",
    },
    {
      id: "warrantyUntil",
      label: "Bảo hành đến",
      render: (item) => item.warrantyUntil || "--",
    },
  ];
  const assetColumnById = new Map(assetTableColumns.map((column) => [column.id, column]));
  const visibleAssetColumnSet = new Set(visibleAssetColumns);
  const configuredAssetColumns = assetColumnOrder
    .map((id) => assetColumnById.get(id))
    .filter((column): column is AssetTableColumnDefinition => {
      if (!column) return false;
      return visibleAssetColumnSet.has(column.id) || Boolean(column.locked);
    });
  const assetTableMinWidth = configuredAssetColumns.reduce(
    (total, column) => total + (ASSET_TABLE_COLUMN_WIDTHS[column.id] ?? 150),
    ASSET_TABLE_ACTIONS_WIDTH +
      ASSET_TABLE_INDEX_WIDTH +
      (assetMultiSelectMode ? ASSET_TABLE_SELECT_WIDTH : 0),
  );
  const columnConfigOrder = [
    ...assetColumnOrder.filter((id) =>
      ASSET_TABLE_COLUMNS.some((column) => column.id === id && column.locked),
    ),
    ...assetColumnOrder.filter((id) =>
      ASSET_TABLE_COLUMNS.some((column) => column.id === id && !column.locked),
    ),
  ];

  const closeImport = () => {
    if (importBusy) return;
    setImportOpen(false);
    setImportCancelConfirm(false);
    setImportFileName("");
    setImportRows([]);
    setImportResult(null);
    setImportMode("VALID_ROWS_ONLY");
    setImportPreviewFilter("ALL");
    setImportTooltip(null);
  };

  const requestCloseImport = () => {
    if (importBusy) return;
    if (importFileName || importRows.length > 0 || importResult) {
      setImportCancelConfirm(true);
      return;
    }
    closeImport();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImportBusy(true);
    setImportResult(null);
    setImportPreviewFilter("ALL");
    try {
      const rows = await parseAssetImportFile(file);
      setImportRows(rows);
      setImportFileName(file.name);
      toast.success(`Đã đọc ${rows.length} dòng từ Excel.`);
    } catch (error) {
      setImportRows([]);
      setImportFileName("");
      toast.error(error instanceof Error ? error.message : "Không đọc được file Excel.");
    } finally {
      setImportBusy(false);
    }
  };

  const handleValidateImport = async () => {
    if (importRows.length === 0) {
      toast.error("Chưa có dữ liệu import.");
      return;
    }
    setImportBusy(true);
    try {
      const result = await validateAssetImport(importRows);
      setImportResult(result);
      setImportPreviewFilter("ALL");
      if (result.errorRows > 0) {
        toast.error(`Có ${result.errorRows} dòng lỗi cần kiểm tra.`);
      } else {
        toast.success("Dữ liệu import hợp lệ.");
      }
    } catch (error) {
      toast.error(readError(error, "Không kiểm tra được dữ liệu import."));
    } finally {
      setImportBusy(false);
    }
  };

  const handleCommitImport = async () => {
    if (importRows.length === 0) {
      toast.error("Chưa có dữ liệu import.");
      return;
    }
    setImportBusy(true);
    try {
      const result = await commitAssetImport({ importMode, rows: importRows });
      setImportResult({
        uploadStatus: result.uploadStatus,
        totalRows: importRows.length,
        validRows: result.importedRows,
        errorRows: result.errorRows,
        warningRows: 0,
        rows: result.rows,
      });
      setImportPreviewFilter("ALL");
      toast.success(`Đã import ${result.importedRows} tài sản.`);
      await reloadAssetList();
    } catch (error) {
      toast.error(readError(error, "Không lưu được dữ liệu import."));
    } finally {
      setImportBusy(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const loadingToast = toast.loading("Đang tạo file mẫu Excel...");
    try {
      const latestCategoryTree = await loadAssetCategoryTree();
      setCategoryTree(latestCategoryTree);
      await downloadAssetImportTemplate(latestCategoryTree);
      toast.success("Đã tải file mẫu Excel.", { id: loadingToast });
    } catch (error) {
      toast.error(readError(error, "Không tạo được file mẫu Excel."), { id: loadingToast });
    }
  };

  const showImportTooltip = (event: MouseEvent<HTMLElement>, messages: string[]) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setImportTooltip({
      text: messages.map((message) => `- ${message}`).join("\n"),
      x: rect.left,
      y: rect.top,
    });
  };

  return (
    <section className="asset-page panel">
      <header className="asset-page-header">
        <div>
          <h2>Danh sách tài sản</h2>
        </div>
      </header>

      <div className="asset-page-actions">
        <button
          type="button"
          className="asset-add-button btn-download-green"
          onClick={handleDownloadTemplate}
        >
          <FiDownload /> Tải mẫu Excel
        </button>
        <button
          type="button"
          className="asset-add-button btn-upload-blue"
          onClick={() => setImportOpen(true)}
        >
          <FiUpload /> Nhập tài sản
        </button>
        {canManage && (
          <button
            type="button"
            className="asset-add-button"
            onClick={() => openModal({ type: "asset", mode: "create" })}
          >
            Thêm thủ công
          </button>
        )}
      </div>

      <div className={`asset-list-layout ${assetCategoryCollapsed ? "category-collapsed" : ""}`}>
        <aside className={`asset-category-sidebar ${assetCategoryCollapsed ? "collapsed" : ""}`}>
          <div className="asset-category-sidebar-head">
            {!assetCategoryCollapsed && (
              <div>
                <span>Loại tài sản</span>
                <strong>{selectedCategoryNode?.name || "Tất cả loại tài sản"}</strong>
              </div>
            )}
            {!assetCategoryCollapsed && (
              <button type="button" className="asset-category-clear" onClick={resetAssetFilters}>
                Tất cả
              </button>
            )}
            <button
              type="button"
              className="asset-category-collapse"
              title={assetCategoryCollapsed ? "Mở bộ lọc loại tài sản" : "Thu bộ lọc loại tài sản"}
              onClick={() => setAssetCategoryCollapsed((value) => !value)}
            >
              {assetCategoryCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
            </button>
          </div>

          {!assetCategoryCollapsed && (
            <div className="asset-category-filter-list">
              <button
                type="button"
                className="asset-category-filter-item all"
                data-selected={!selectedCategoryNode ? "true" : undefined}
                onClick={resetAssetFilters}
              >
                <span className="asset-category-filter-spacer" />
                <span className="asset-category-filter-copy">
                  <strong>Tất cả loại tài sản</strong>
                  <small>Toàn bộ tài sản</small>
                </span>
                <span className="asset-category-filter-count">{assets.length}</span>
              </button>

              {categoryTree.map((node) => (
                <AssetCategoryFilterNode
                  key={node.id}
                  node={node}
                  selectedId={selectedCategoryNode?.id}
                  selectedPathIds={selectedCategoryPathIds}
                  expandedIds={expandedAssetCategoryIds}
                  assetCounts={categoryAssetCounts}
                  onSelect={(category) =>
                    setCategoryPath(findCategoryIdPath(categoryTree, category.id))
                  }
                  onToggle={toggleAssetCategory}
                />
              ))}
            </div>
          )}
        </aside>

        <div className="asset-results-column">
          <div className="asset-toolbar">
            <label className="asset-search">
              <FiSearch />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo mã, tên, serial, hợp đồng, hóa đơn, nhà cung cấp..."
              />
            </label>
            <label className="asset-filter-field">
              <span>Trạng thái</span>
              <SearchableSelect
                value={statusFilter}
                onChange={(val: string) => setStatusFilter(val as AssetStatusFilter)}
              >
                {(["ALL", "IN_STOCK", "ASSIGNED", "MAINTENANCE", "DISPOSED"] as const).map(
                  (status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ),
                )}
              </SearchableSelect>
            </label>
            <label className="asset-filter-field">
              <span>Giá trị</span>
              <SearchableSelect
                value={valueFilter}
                onChange={(val: string) => setValueFilter(val as AssetValueFilter)}
              >
                {ASSET_VALUE_FILTERS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SearchableSelect>
            </label>
            <label className="asset-date-filter">
              <span>Từ ngày sử dụng</span>
              <input
                type="date"
                value={useDateFrom}
                onChange={(event) => setUseDateFrom(event.target.value)}
              />
            </label>
            <label className="asset-date-filter">
              <span>Đến ngày sử dụng</span>
              <input
                type="date"
                value={useDateTo}
                min={useDateFrom || undefined}
                onChange={(event) => setUseDateTo(event.target.value)}
              />
            </label>
          </div>

          <div className={`asset-list-panel ${listRefreshing ? "is-refreshing" : ""}`}>
            <div className="asset-list-head">
              <div className="asset-list-summary">
                <span className="asset-total-value-line">
                  Tổng giá trị của tài sản đang hiển thị:{" "}
                  <span className="asset-total-value" style={{ whiteSpace: "nowrap" }}>
                    <span style={{ color: "#2563eb", fontWeight: 600 }}>
                      {money.format(filteredValue)}
                    </span>

                    {filteredAssets.length !== assets.length && (
                      <>
                        {" / "}
                        <span style={{ color: "#2563eb", fontWeight: 600 }}>
                          {money.format(totalValue)}
                        </span>{" "}
                        toàn bộ
                      </>
                    )}
                  </span>
                </span>
                {catalogViewFilter.id !== null && (
                  <span className="asset-catalog-filter-context">
                    Danh mục: {catalogViewFilter.name || `#${catalogViewFilter.id}`}
                    <button
                      type="button"
                      onClick={clearCatalogViewFilter}
                      title="Bỏ lọc danh mục"
                      aria-label="Bỏ lọc danh mục"
                    >
                      <FiX aria-hidden="true" />
                    </button>
                  </span>
                )}
              </div>
              <div className="asset-list-head-actions">
                <button
                  type="button"
                  className="asset-table-text-action asset-multi-select-toggle"
                  data-active={assetMultiSelectMode ? "true" : undefined}
                  onClick={() => {
                    setAssetMultiSelectMode((enabled) => {
                      if (enabled) clearSelectedAssets();
                      return !enabled;
                    });
                  }}
                >
                  {assetMultiSelectMode ? "Tắt chọn nhiều" : "Chọn nhiều"}
                </button>
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
                  className="asset-column-popover"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="asset-column-config-title"
                >
                  <div className="asset-column-popover-head">
                    <div>
                      <strong id="asset-column-config-title">Cấu hình cột</strong>
                      <span>Bật/tắt cột cần xem. Các cột cố định luôn hiển thị trong bảng.</span>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setColumnConfigOpen(false)}
                    >
                      <FiX />
                    </button>
                  </div>
                  <div className="asset-column-list">
                    {columnConfigOrder.map((id) => {
                      const column = ASSET_TABLE_COLUMNS.find((item) => item.id === id);
                      if (!column) return null;
                      const locked = Boolean(column.locked);
                      const checked = visibleAssetColumnSet.has(id) || Boolean(column.locked);
                      return (
                        <label
                          key={id}
                          className={`asset-column-option ${
                            draggedAssetColumn === id ? "is-dragging" : ""
                          } ${locked ? "is-locked" : ""}`}
                          draggable={!locked}
                          onDragStart={() => {
                            if (!locked) setDraggedAssetColumn(id);
                          }}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => dropAssetColumn(id)}
                          onDragEnd={() => setDraggedAssetColumn(null)}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={locked}
                            onChange={() => toggleAssetColumn(id)}
                          />
                          <span>{column.label}</span>
                          {locked && <em>Bắt buộc</em>}
                        </label>
                      );
                    })}
                  </div>
                  <div className="asset-column-popover-actions">
                    <button type="button" className="secondary" onClick={resetAssetColumns}>
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

            {canManage && (
              <div
                className={`asset-selection-workspace ${
                  selectedAssets.length > 0 ? "is-active" : "is-empty"
                }`}
                role="region"
                aria-label="Thao tác tài sản đã chọn"
              >
                <div className="asset-selection-summary">
                  <strong>{selectedAssets.length} tài sản đã chọn</strong>
                  <span>Tổng giá trị: {money.format(selectedAssetsValue)}</span>
                </div>
                <div className="asset-selection-actions asset-bulk-desktop-actions">
                  <button
                    type="button"
                    className="primary-action asset-catalog-action asset-bulk-optional-action"
                    disabled={selectedAssets.length === 0 || bulkActionBusy}
                    onClick={() => openBulkPanelAction("catalog")}
                  >
                    <FiFolderPlus /> Tạo/Gán danh mục
                  </button>
                  <button
                    type="button"
                    className="secondary asset-select-same-name"
                    title="Chọn tất cả tài sản cùng tên và cùng loại trên mọi trang"
                    disabled={bulkActionBusy || !canSelectSameNameAssets}
                    onClick={handleSelectSameNameAssets}
                  >
                    <FiCheckSquare /> Chọn cùng tên ({sameNameCategoryAssets.length})
                  </button>
                  <button
                    type="button"
                    className="secondary asset-bulk-optional-action"
                    disabled={selectedAssets.length === 0 || bulkActionBusy}
                    onClick={() => openBulkPanelAction("status")}
                  >
                    <FiEdit2 /> Cập nhật trạng thái
                  </button>
                  <button
                    type="button"
                    className="secondary asset-bulk-optional-action"
                    disabled={selectedAssets.length === 0 || bulkActionBusy}
                    onClick={() => openBulkPanelAction("qr")}
                  >
                    <FiPrinter /> In QR
                  </button>
                  <button
                    type="button"
                    className="danger-action"
                    disabled={selectedAssets.length === 0 || bulkActionBusy}
                    onClick={() => void handleBulkDeleteAssets()}
                  >
                    <FiTrash2 /> Xóa
                  </button>
                  <button
                    type="button"
                    className="secondary asset-clear-selection"
                    disabled={selectedAssets.length === 0 || bulkActionBusy}
                    onClick={clearSelectedAssets}
                  >
                    <FiX /> Bỏ chọn
                  </button>
                </div>
                <label className="asset-bulk-action-select asset-bulk-mobile-actions">
                  <span>Thao tác</span>
                  <SearchableSelect
                    value={bulkPanelAction || ""}
                    disabled={selectedAssets.length === 0 || bulkActionBusy}
                    onChange={(val: string) => {
                      const action = val as Exclude<AssetBulkAction, null> | "";
                      if (!action) {
                        setBulkPanelAction(null);
                        return;
                      }
                      openBulkPanelAction(action);
                    }}
                  >
                    <option value="">Chọn thao tác</option>
                    <option value="status">Cập nhật trạng thái</option>
                    <option value="catalog">Gán danh mục</option>
                    <option value="qr">In QR theo nhóm</option>
                  </SearchableSelect>
                </label>
              </div>
            )}

            <div
              className="asset-table"
              style={{ "--qlvt-table-min-width": `${assetTableMinWidth}px` } as CSSProperties}
            >
              <table className={assetMultiSelectMode ? "is-multi-select" : "is-single-select"}>
                <thead>
                  <tr>
                    {assetMultiSelectMode && (
                      <th className="asset-table-select-col asset-table-sticky-select">
                        <label
                          className="asset-table-checkbox"
                          title="Chọn toàn bộ dòng hiển thị trên trang hiện tại"
                        >
                          <input
                            type="checkbox"
                            checked={allPageSelected}
                            ref={(input) => {
                              if (input) input.indeterminate = somePageSelected;
                            }}
                            onChange={toggleCurrentPageSelected}
                          />
                          <span />
                        </label>
                      </th>
                    )}
                    <th className="asset-table-index-col asset-table-sticky-left asset-table-sticky-index table-index-header">
                      STT
                    </th>
                    {configuredAssetColumns.map((column) => (
                      <th
                        key={column.id}
                        className={`asset-table-col-${column.id} ${
                          ["asset", "category"].includes(column.id)
                            ? `asset-table-sticky-left asset-table-sticky-${column.id}`
                            : ""
                        } ${column.align ? `align-${column.align}` : ""}`}
                      >
                        {column.label}
                      </th>
                    ))}
                    <th className="asset-table-actions-col asset-table-sticky-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedAssets.length === 0 ? (
                    <tr className="asset-table-empty-row">
                      <td
                        colSpan={configuredAssetColumns.length + 2 + (assetMultiSelectMode ? 1 : 0)}
                      >
                        <div className="asset-table-empty-state">
                          Không có tài sản phù hợp bộ lọc.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedAssets.map((item, index) => (
                      <tr
                        key={item.id}
                        className={selectedAssetIds.has(item.id) ? "is-selected" : undefined}
                      >
                        {assetMultiSelectMode && (
                          <td className="asset-table-select-col asset-table-sticky-select">
                            <label
                              className="asset-table-checkbox"
                              title={`Chọn ${item.assetCode}`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedAssetIds.has(item.id)}
                                onChange={() => toggleAssetSelected(item.id)}
                              />
                              <span />
                            </label>
                          </td>
                        )}
                        <td className="asset-table-index-col asset-table-sticky-left asset-table-sticky-index table-index-cell">
                          {(safeAssetPage - 1) * assetPageSize + index + 1}
                        </td>
                        {configuredAssetColumns.map((column) => {
                          const content = column.render(item);
                          const titleText =
                            typeof content === "string"
                              ? content
                              : typeof content === "number"
                                ? String(content)
                                : undefined;
                          return (
                            <td
                              key={column.id}
                              title={titleText}
                              className={`asset-table-col-${column.id} ${
                                ["asset", "category"].includes(column.id)
                                  ? `asset-table-sticky-left asset-table-sticky-${column.id}`
                                  : ""
                              } ${column.align ? `align-${column.align}` : ""}`}
                            >
                              {content}
                            </td>
                          );
                        })}
                        <td className="asset-table-actions-col asset-table-sticky-right">
                          <OverflowActions
                            label={`Mở thao tác cho ${item.assetCode}`}
                            actions={[
                              {
                                label: "Xem chi tiết",
                                onClick: () => openAssetDetail(item),
                              },
                              {
                                label: "Xem QR",
                                onClick: () => void openAssetQr(item),
                              },
                              ...(canManage
                                ? [
                                    {
                                      label: "Xóa",
                                      danger: true,
                                      onClick: () => {
                                        void handleDeleteAsset(item);
                                      },
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <AssetListPagination
              page={safeAssetPage}
              pageSize={assetPageSize}
              total={filteredAssets.length}
              onPageChange={setAssetPage}
              onPageSizeChange={(nextPageSize) => {
                setAssetPageSize(nextPageSize);
                setAssetPage(1);
              }}
            />
            {listRefreshing && (
              <div className="asset-list-refreshing">Đang cập nhật danh sách...</div>
            )}
          </div>

          <section className="asset-list-insights" aria-label="Thống kê tài sản đang hiển thị">
            <div className="asset-insights-title">
              <div>
                <strong>Phân tích nhanh tài sản</strong>
                <span>Trực quan theo dữ liệu đang hiển thị trong danh sách.</span>
              </div>
              <small>{filteredAssets.length} tài sản</small>
            </div>
            {[
              ["Theo trạng thái", assetListInsights.statuses],
              ["Theo loại", assetListInsights.categories],
              ["Theo giá trị", assetListInsights.values],
              ["Theo chi nhánh", assetListInsights.sites],
            ].map(([title, items]) => {
              const insightItems = items as Array<{ label: string; value: number }>;
              const total = insightItems.reduce((sum, item) => sum + item.value, 0);
              let accumulated = 0;
              const palette = ["#15507f", "#2e82b6", "#65a9cf", "#94c8df", "#d0e7f3"];
              const segments =
                total > 0
                  ? insightItems
                      .map((item, index) => {
                        const start = accumulated;
                        accumulated += (item.value / total) * 100;
                        return `${palette[index % palette.length]} ${start}% ${accumulated}%`;
                      })
                      .join(", ")
                  : "#e5e7eb 0 100%";

              return (
                <article className="asset-insight-card" key={title as string}>
                  <div className="asset-insight-head">
                    <strong>{title as string}</strong>
                    <span>{total} mục</span>
                  </div>
                  {insightItems.length === 0 ? (
                    <span className="asset-insight-empty">Chưa có dữ liệu</span>
                  ) : (
                    <div className="asset-insight-visual">
                      <div
                        className="asset-insight-donut"
                        style={{ "--asset-donut": segments } as CSSProperties}
                        title={insightItems
                          .map((item) => `${item.label}: ${item.value}`)
                          .join("\n")}
                        aria-hidden="true"
                      />
                      <div className="asset-insight-bars">
                        {insightItems.map((item, index) => (
                          <p key={item.label}>
                            <i style={{ background: palette[index % palette.length] }} />
                            <span>{item.label}</span>
                            <b>{item.value}</b>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        </div>
      </div>

      {bulkPanelAction === "status" && selectedAssets.length > 0 && (
        <div className="modal-backdrop">
          <div
            className="crud-modal asset-bulk-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="asset-bulk-status-title"
          >
            <div className="modal-head">
              <div className="modal-title-group">
                <span className="modal-title-icon edit">
                  <FiEdit2 />
                </span>
                <div>
                  <h2 id="asset-bulk-status-title">Cập nhật trạng thái</h2>
                  <p>Áp dụng cho {selectedAssets.length} tài sản đã chọn</p>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Đóng"
                disabled={bulkActionBusy}
                onClick={() => setBulkPanelAction(null)}
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body asset-bulk-modal-body">
              <label>
                <span>Trạng thái mới</span>
                <SearchableSelect
                  value={bulkStatus}
                  onChange={(val: string) =>
                    setBulkStatus(val as (typeof ASSET_MUTABLE_STATUSES)[number])
                  }
                >
                  {ASSET_MUTABLE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </SearchableSelect>
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                disabled={bulkActionBusy}
                onClick={() => setBulkPanelAction(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="primary-action"
                disabled={bulkActionBusy}
                onClick={() => void handleBulkUpdateStatus()}
              >
                Lưu trạng thái
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkPanelAction === "catalog" && selectedAssets.length > 0 && (
        <div className="modal-backdrop">
          <div
            className="crud-modal asset-bulk-modal asset-bulk-catalog-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="asset-bulk-catalog-title"
          >
            <div className="modal-head">
              <div className="modal-title-group">
                <span className="modal-title-icon create">
                  <FiFolderPlus />
                </span>
                <div>
                  <h2 id="asset-bulk-catalog-title">Tạo hoặc gán danh mục</h2>
                  <p>{selectedAssets.length} tài sản đã chọn</p>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Đóng"
                disabled={bulkActionBusy}
                onClick={() => setBulkPanelAction(null)}
              >
                <FiX />
              </button>
            </div>

            <div className="modal-body asset-bulk-modal-body">
              <div className="asset-bulk-context asset-bulk-context-list">
                <div className="asset-bulk-context-header">
                  <span>Tài sản</span>
                  <span>Số lượng</span>
                  <span>Loại tài sản</span>
                  <span>Danh mục hiện tại</span>
                </div>
                {selectedBulkCatalogGroups.map((group) => (
                  <div className="asset-bulk-context-row" key={group.key}>
                    <strong>{group.name}</strong>
                    <strong>{group.count}</strong>
                    <strong>{group.categoryLabel}</strong>
                    <strong>{group.catalogLabel}</strong>
                  </div>
                ))}
              </div>

              {catalogAssignmentDisabled && (
                <div className="asset-bulk-panel-warning" role="alert">
                  Các tài sản đã chọn phải cùng tên và cùng loại tài sản.
                </div>
              )}

              {selectedAssetsHaveCatalog && !catalogAssignmentDisabled && (
                <div className="asset-bulk-panel-warning" role="status">
                  Tài sản đã có danh mục. Chọn đổi danh mục để chuyển sang danh mục khác cùng mã
                  loại.
                </div>
              )}

              <div
                className={`asset-bulk-mode-tabs ${
                  selectedAssetsHaveCatalog ? "has-change-mode" : ""
                }`}
                role="tablist"
                aria-label="Cách gán danh mục"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={bulkCatalogMode === "existing"}
                  disabled={catalogAssignmentDisabled || bulkActionBusy}
                  onClick={() => {
                    setBulkCatalogItemId(selectedCurrentBulkCatalogId);
                    setBulkCatalogMode("existing");
                  }}
                >
                  Danh mục có sẵn
                </button>
                {selectedAssetsHaveCatalog && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={bulkCatalogMode === "change"}
                    disabled={catalogAssignmentDisabled || bulkActionBusy}
                    onClick={() => {
                      setBulkCatalogItemId("");
                      setBulkCatalogMode("change");
                    }}
                  >
                    Đổi danh mục
                  </button>
                )}
                <button
                  type="button"
                  role="tab"
                  aria-selected={bulkCatalogMode === "new"}
                  disabled={
                    catalogAssignmentDisabled || selectedAssetsHaveCatalog || bulkActionBusy
                  }
                  onClick={() => {
                    setBulkCatalogItemId("");
                    setBulkCatalogMode("new");
                  }}
                >
                  Tạo danh mục mới
                </button>
              </div>

              <div
                className="asset-bulk-catalog-fields"
                role="tabpanel"
                hidden={bulkCatalogMode !== "existing"}
              >
                <label>
                  <span>Danh mục</span>
                  <SearchableSelect
                    value={bulkCatalogItemId}
                    onChange={setBulkCatalogItemId}
                    disabled={catalogAssignmentDisabled || selectedAssetsHaveCatalog}
                    options={[
                      { value: "", label: "Chọn danh mục" },
                      ...compatibleBulkCatalogItems.map((item) => ({
                        value: String(item.id),
                        label: catalogAssignmentLabel(item),
                      })),
                    ]}
                  />
                </label>
                {compatibleBulkCatalogItems.length === 0 && (
                  <span className="asset-bulk-empty-note">
                    Chưa có danh mục phù hợp với mã loại tài sản này.
                  </span>
                )}
              </div>
              <div
                className="asset-bulk-catalog-fields change-catalog"
                role="tabpanel"
                hidden={bulkCatalogMode !== "change"}
              >
                <label>
                  <span>Danh mục khác</span>
                  <SearchableSelect
                    value={bulkCatalogItemId}
                    onChange={setBulkCatalogItemId}
                    disabled={catalogAssignmentDisabled}
                    options={[
                      { value: "", label: "Chọn danh mục khác" },
                      ...selectableBulkCatalogItems.map((item) => ({
                        value: String(item.id),
                        label: catalogAssignmentLabel(item),
                      })),
                    ]}
                  />
                </label>
                {selectableBulkCatalogItems.length === 0 && (
                  <span className="asset-bulk-empty-note">
                    Chưa có danh mục khác cùng mã loại để đổi cho nhóm tài sản này.
                  </span>
                )}
              </div>
              <div
                className="asset-bulk-catalog-fields new-catalog"
                role="tabpanel"
                hidden={bulkCatalogMode !== "new"}
              >
                <label>
                  <span>Tên danh mục mới</span>
                  <input
                    value={bulkNewCatalogName}
                    onChange={(event) => setBulkNewCatalogName(event.target.value)}
                    disabled={catalogAssignmentDisabled}
                  />
                </label>
                <label>
                  <span>Loại tài sản</span>
                  <input
                    value={
                      selectedAssetCategory
                        ? `${selectedAssetCategory.name} (${selectedAssetCategory.code})`
                        : "Chưa có loại tài sản"
                    }
                    readOnly
                    disabled
                  />
                </label>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                disabled={bulkActionBusy}
                onClick={() => setBulkPanelAction(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="primary-action"
                hidden={bulkCatalogMode !== "existing"}
                disabled={
                  bulkActionBusy ||
                  !bulkCatalogItemId ||
                  catalogAssignmentDisabled ||
                  selectedAssetsHaveCatalog
                }
                onClick={() => void handleBulkAssignCatalog()}
              >
                Gán danh mục
              </button>
              <button
                type="button"
                className="primary-action"
                hidden={bulkCatalogMode !== "change"}
                disabled={bulkActionBusy || !bulkCatalogItemId || catalogAssignmentDisabled}
                onClick={() => void handleBulkAssignCatalog()}
              >
                Đổi danh mục
              </button>
              <button
                type="button"
                className="primary-action"
                hidden={bulkCatalogMode !== "new"}
                disabled={bulkActionBusy || !bulkNewCatalogName.trim() || catalogAssignmentDisabled}
                onClick={() => void handleBulkCreateAndAssignCatalog()}
              >
                Tạo và gán danh mục
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAsset && assetDraft && (
        <div className="modal-backdrop">
          <div className="crud-modal asset-detail-modal">
            <div className="modal-head">
              <div className="modal-title-group">
                <span className="modal-title-icon edit">
                  <FiEye />
                </span>
                <div>
                  <h2>Chi tiết tài sản</h2>
                  <p>
                    {selectedAsset.assetCode} · {selectedAsset.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={closeAssetDetail}
                disabled={assetSaving}
              >
                <FiX />
              </button>
            </div>

            <div className="asset-detail-tabs" role="tablist" aria-label="Nội dung tài sản">
              <button
                type="button"
                role="tab"
                aria-selected={assetDetailView === "details"}
                className={assetDetailView === "details" ? "is-active" : ""}
                onClick={() => setAssetDetailView("details")}
              >
                <FiFileText /> Thông tin tài sản
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={assetDetailView === "history"}
                className={assetDetailView === "history" ? "is-active" : ""}
                onClick={() => void openAssetHistory()}
              >
                <FiClock /> Lịch sử chỉnh sửa
              </button>
            </div>

            <div
              className={`asset-detail-body ${assetDetailView === "history" ? "is-hidden" : ""}`}
              onFocus={revealFullFieldValue}
              onMouseOver={revealFullFieldValue}
            >
              <div className="asset-detail-hero">
                <div>
                  <span>Mã tài sản</span>
                  <strong>{selectedAsset.assetCode}</strong>
                </div>
                <div>
                  <span>Loại</span>
                  <strong>
                    {selectedAsset.assetCategory?.name ||
                      selectedAsset.category ||
                      "Chưa phân loại"}
                  </strong>
                </div>
                <div>
                  <span>Phân loại</span>
                  <strong>{classLabel(selectedAsset.assetClass)}</strong>
                </div>
                <div>
                  <span>Trạng thái</span>
                  <StatusBadge value={selectedAsset.status} />
                </div>
              </div>

              <div className="asset-detail-grid">
                <section className="asset-detail-section">
                  <h3>Định danh và phân loại</h3>
                  <div className="asset-detail-fields">
                    <label className="asset-detail-field-span-2">
                      <span>Tên tài sản</span>
                      <input
                        value={assetDraft.name}
                        onChange={(event) => updateAssetDraft("name", event.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Mã tài sản</span>
                      <input value={assetDraft.assetCode} disabled />
                    </label>
                    <label>
                      <span>Loại tài sản</span>
                      <input value={assetDraft.category} disabled />
                    </label>
                    <label>
                      <span>Mã loại</span>
                      <input value={selectedAsset.assetCategory?.code || "--"} disabled />
                    </label>
                    <label>
                      <span>Nhóm tài sản</span>
                      <input value={classLabel(assetDraft.assetClass)} disabled />
                    </label>
                    <label>
                      <span>Loại tài sản cố định</span>
                      <input value={classLabel(assetDraft.fixedAssetType)} disabled />
                    </label>
                    <label>
                      <span>Loại công cụ dụng cụ</span>
                      <input value={classLabel(assetDraft.toolUsageType)} disabled />
                    </label>
                    <label>
                      <span>Danh mục</span>
                      <SearchableSelect
                        value={String(assetDraft.catalogItemId || "")}
                        onChange={(value) =>
                          updateAssetDraft("catalogItemId", value ? Number(value) : null)
                        }
                        options={[
                          ...(selectedAsset.catalogItem
                            ? []
                            : [{ value: "", label: "Chưa gắn danh mục" }]),
                          ...(catalogItems || [])
                            .filter(
                              (item) =>
                                item.categoryId === assetDraft.categoryId &&
                                (item.active || item.id === assetDraft.catalogItemId),
                            )
                            .map((item) => ({
                              value: String(item.id),
                              label: catalogAssignmentLabel(item),
                            })),
                        ]}
                      />
                    </label>
                    <label>
                      <span>Tài sản cha</span>
                      <input
                        value={
                          selectedAsset.parentAsset
                            ? `${selectedAsset.parentAsset.assetCode} - ${selectedAsset.parentAsset.name}`
                            : "Không có"
                        }
                        disabled
                      />
                    </label>
                    <label>
                      <span>Serial/MAC</span>
                      <input
                        value={assetDraft.serialNumber || ""}
                        onChange={(event) => updateAssetDraft("serialNumber", event.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Trạng thái</span>
                      <SearchableSelect
                        value={assetDraft.status || "IN_STOCK"}
                        onChange={(val: string) => updateAssetDraft("status", val)}
                        disabled={!canManage || assetSaving}
                      >
                        <option value="IN_STOCK">Trong kho</option>
                        <option value="ASSIGNED">Đã cấp phát</option>
                        <option value="MAINTENANCE">Bảo trì</option>
                        <option value="DISPOSED">Đã thanh lý</option>
                        <option value="LOST">Mất</option>
                      </SearchableSelect>
                    </label>
                    <label className="asset-detail-field-span-2">
                      <span>Nguồn hình thành</span>
                      <input
                        value={assetDraft.source || ""}
                        onChange={(event) => updateAssetDraft("source", event.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                  </div>
                </section>
                <section className="asset-detail-section">
                  <h3>
                    <span>Sử dụng, đơn vị và vị trí</span>
                    <button
                      type="button"
                      style={{
                        float: "right",
                        marginTop: "-2px",
                        color: "#2563eb",
                        textDecoration: "underline",
                        background: "none",
                        padding: 0,
                        fontWeight: 500,
                        fontSize: "13px",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onClick={() => window.open("/transfers", "_blank")}
                    >
                      Bàn giao
                    </button>
                  </h3>
                  <div className="asset-detail-fields">
                    <label>
                      <span>Site hiện tại</span>
                      <input type="text" value={siteName(assetDraft.siteId)} disabled />
                    </label>
                    <label>
                      <span>Phòng ban quản lý</span>
                      <input
                        type="text"
                        value={
                          departments.find((d) => d.id === assetDraft.departmentId)?.name || "--"
                        }
                        disabled
                      />
                    </label>
                    <label>
                      <span>Nhân sự đang giữ</span>
                      <input
                        type="text"
                        value={employeeName(assetDraft.assignedEmployeeId)}
                        disabled
                      />
                    </label>
                    <label>
                      <span>Dự án</span>
                      <input
                        type="text"
                        value={projects.find((p) => p.id === assetDraft.projectId)?.name || "--"}
                        disabled
                      />
                    </label>
                    <label>
                      <span>Ngày đưa vào sử dụng</span>
                      <input type="date" value={selectedAsset.useDate || ""} disabled />
                    </label>
                    <label>
                      <span>Số hợp đồng</span>
                      <input
                        value={assetDraft.contractNumber || ""}
                        onChange={(event) => updateAssetDraft("contractNumber", event.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Số hóa đơn</span>
                      <input
                        value={assetDraft.invoiceNumber || ""}
                        onChange={(event) => updateAssetDraft("invoiceNumber", event.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                  </div>
                </section>

                <section className="asset-detail-section">
                  <h3>Tài chính và khấu hao</h3>
                  <div className="asset-detail-fields">
                    <label>
                      <span>Nguyên giá</span>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={
                            assetDraft.originalCost != null
                              ? money.format(assetDraft.originalCost)
                              : ""
                          }
                          onChange={(event) =>
                            updateAssetDraft(
                              "originalCost",
                              optionalNumber(event.target.value.replace(/[^0-9]/g, "")),
                            )
                          }
                          disabled={!canManage || assetSaving}
                          style={{ width: "100%", paddingRight: "30px" }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#6b7280",
                            fontWeight: 700,
                            fontSize: "12px",
                          }}
                        >
                          đ
                        </span>
                      </div>
                    </label>
                    <label>
                      <span>Giá mua/ghi nhận</span>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={
                            assetDraft.purchaseCost != null
                              ? money.format(assetDraft.purchaseCost)
                              : ""
                          }
                          onChange={(event) =>
                            updateAssetDraft(
                              "purchaseCost",
                              optionalNumber(event.target.value.replace(/[^0-9]/g, "")),
                            )
                          }
                          disabled={!canManage || assetSaving}
                          style={{ width: "100%", paddingRight: "30px" }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#6b7280",
                            fontWeight: 700,
                            fontSize: "12px",
                          }}
                        >
                          đ
                        </span>
                      </div>
                    </label>
                    <label>
                      <span>Hao mòn lũy kế</span>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={
                            assetDraft.accumulatedDepreciation != null
                              ? money.format(assetDraft.accumulatedDepreciation)
                              : ""
                          }
                          onChange={(event) =>
                            updateAssetDraft(
                              "accumulatedDepreciation",
                              optionalNumber(event.target.value.replace(/[^0-9]/g, "")),
                            )
                          }
                          disabled={!canManage || assetSaving}
                          style={{ width: "100%", paddingRight: "30px" }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#6b7280",
                            fontWeight: 700,
                            fontSize: "12px",
                          }}
                        >
                          đ
                        </span>
                      </div>
                    </label>
                    <label>
                      <span>Giá trị sổ sách</span>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={
                            assetDraft.bookValue != null ? money.format(assetDraft.bookValue) : ""
                          }
                          onChange={(event) =>
                            updateAssetDraft(
                              "bookValue",
                              optionalNumber(event.target.value.replace(/[^0-9]/g, "")),
                            )
                          }
                          disabled={!canManage || assetSaving}
                          style={{ width: "100%", paddingRight: "30px" }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#6b7280",
                            fontWeight: 700,
                            fontSize: "12px",
                          }}
                        >
                          đ
                        </span>
                      </div>
                    </label>
                    <label>
                      <span>Giá trị còn lại</span>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={
                            assetDraft.residualValue != null
                              ? money.format(assetDraft.residualValue)
                              : ""
                          }
                          onChange={(event) =>
                            updateAssetDraft(
                              "residualValue",
                              optionalNumber(event.target.value.replace(/[^0-9]/g, "")),
                            )
                          }
                          disabled={!canManage || assetSaving}
                          style={{ width: "100%", paddingRight: "30px" }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#6b7280",
                            fontWeight: 700,
                            fontSize: "12px",
                          }}
                        >
                          đ
                        </span>
                      </div>
                    </label>
                    <label>
                      <span>Ngày mua</span>
                      <input
                        type="date"
                        value={assetDraft.purchaseDate || ""}
                        onChange={(event) => updateAssetDraft("purchaseDate", event.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Ngày bắt đầu khấu hao</span>
                      <input
                        type="date"
                        value={assetDraft.depreciationStartDate || ""}
                        onChange={(event) =>
                          updateAssetDraft("depreciationStartDate", event.target.value)
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Bảo hành đến</span>
                      <input
                        type="date"
                        value={assetDraft.warrantyUntil || ""}
                        onChange={(event) => updateAssetDraft("warrantyUntil", event.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Phương pháp khấu hao</span>
                      <SearchableSelect
                        value={assetDraft.depreciationMethod || ""}
                        onChange={(value) => updateAssetDraft("depreciationMethod", value)}
                        disabled={!canManage || assetSaving}
                      >
                        <option value="">Chưa chọn</option>
                        <option value="NONE">Không khấu hao</option>
                        <option value="STRAIGHT_LINE">Tuyến tính</option>
                        <option value="DECLINING_BALANCE">Số dư giảm dần</option>
                      </SearchableSelect>
                    </label>
                    <label>
                      <span>Số tháng sử dụng</span>
                      <input
                        type="number"
                        value={assetDraft.usefulLifeMonths ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("usefulLifeMonths", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Số năm sử dụng</span>
                      <input
                        type="number"
                        value={assetDraft.usefulLifeYears ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("usefulLifeYears", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Tỷ lệ khấu hao</span>
                      <input
                        type="number"
                        value={assetDraft.depreciationRate ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("depreciationRate", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                  </div>
                </section>

                <section className="asset-detail-section">
                  <h3>Thông số kỹ thuật</h3>
                  <div className="asset-detail-fields">
                    <label>
                      <span>Xuất xứ/mã quốc gia</span>
                      <input
                        value={assetDraft.countryCode || ""}
                        onChange={(event) => updateAssetDraft("countryCode", event.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Năm sản xuất</span>
                      <SearchableSelect
                        value={String(assetDraft.manufactureYear ?? "")}
                        options={CALENDAR_YEAR_OPTIONS}
                        onChange={(value) =>
                          updateAssetDraft("manufactureYear", optionalNumber(value))
                        }
                        placeholder="Chưa chọn năm"
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Năm lắp đặt/cài đặt</span>
                      <SearchableSelect
                        value={String(assetDraft.installationYear ?? "")}
                        options={CALENDAR_YEAR_OPTIONS}
                        onChange={(value) =>
                          updateAssetDraft("installationYear", optionalNumber(value))
                        }
                        placeholder="Chưa chọn năm"
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Công suất thiết kế</span>
                      <input
                        type="number"
                        value={assetDraft.capacity ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("capacity", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Công suất thực tế</span>
                      <input
                        type="number"
                        value={assetDraft.realCapacity ?? ""}
                        onChange={(event) =>
                          updateAssetDraft("realCapacity", optionalNumber(event.target.value))
                        }
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Đơn vị công suất</span>
                      <input
                        value={assetDraft.capacityUnit || ""}
                        onChange={(event) => updateAssetDraft("capacityUnit", event.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                  </div>
                  <RichTextEditor
                    label="Mô tả kỹ thuật"
                    value={assetDraft.technicalDescription || ""}
                    onChange={(value) => updateAssetDraft("technicalDescription", value)}
                    disabled={!canManage || assetSaving}
                    minHeight={168}
                  />
                </section>

                <section className="asset-detail-section">
                  <h3>Thanh lý và hệ thống</h3>
                  <div className="asset-detail-fields">
                    <label>
                      <span>Ngày thanh lý</span>
                      <input
                        type="date"
                        value={assetDraft.disposalDate || ""}
                        onChange={(e) => updateAssetDraft("disposalDate", e.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Giá thanh lý</span>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={
                            assetDraft.disposalPrice != null
                              ? money.format(assetDraft.disposalPrice)
                              : ""
                          }
                          onChange={(e) =>
                            updateAssetDraft(
                              "disposalPrice",
                              optionalNumber(e.target.value.replace(/[^0-9]/g, "")),
                            )
                          }
                          disabled={!canManage || assetSaving}
                          style={{ width: "100%", paddingRight: "30px" }}
                        />
                        <span
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#6b7280",
                            fontWeight: 700,
                            fontSize: "12px",
                          }}
                        >
                          đ
                        </span>
                      </div>
                    </label>
                    <label className="asset-detail-field-span-2">
                      <span>Lý do thanh lý</span>
                      <input
                        type="text"
                        value={assetDraft.disposalReason || ""}
                        onChange={(e) => updateAssetDraft("disposalReason", e.target.value)}
                        disabled={!canManage || assetSaving}
                      />
                    </label>
                    <label>
                      <span>Nhà cung cấp</span>
                      <SearchableSelect
                        value={assetDraft.vendorId != null ? String(assetDraft.vendorId) : ""}
                        onChange={(val: string) =>
                          updateAssetDraft("vendorId", optionalNumber(val))
                        }
                        disabled={!canManage || assetSaving}
                      >
                        <option value="">Chưa có nhà cung cấp</option>
                        {vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </SearchableSelect>
                    </label>
                    <label>
                      <span>Ngày tạo</span>
                      <input type="text" value={dateTimeLabel(selectedAsset.createdAt)} disabled />
                    </label>
                    <label>
                      <span>Cập nhật lần cuối</span>
                      <input type="text" value={dateTimeLabel(selectedAsset.updatedAt)} disabled />
                    </label>
                  </div>
                </section>

                <section className="asset-detail-section asset-detail-section-wide">
                  <h3>Ghi chú</h3>
                  <RichTextEditor
                    label="Nội dung ghi chú"
                    value={assetDraft.notes || ""}
                    onChange={(value) => updateAssetDraft("notes", value)}
                    disabled={!canManage || assetSaving}
                    minHeight={112}
                  />
                </section>
              </div>
            </div>

            {assetDetailView === "history" && (
              <div className="asset-change-history">
                <div className="asset-change-history-head">
                  <button type="button" onClick={() => setAssetDetailView("details")}>
                    <FiChevronLeft /> Quay lại thông tin
                  </button>
                  <span>{assetChangeHistory.length} lần thay đổi</span>
                </div>

                {assetHistoryLoading ? (
                  <div className="asset-change-history-state">Đang tải lịch sử...</div>
                ) : assetHistoryError ? (
                  <div className="asset-change-history-state is-error">{assetHistoryError}</div>
                ) : assetChangeHistory.length === 0 ? (
                  <div className="asset-change-history-state">
                    Tài sản chưa có lịch sử chỉnh sửa.
                  </div>
                ) : (
                  <div className="asset-change-timeline">
                    {assetChangeHistory.map((log) => (
                      <article className="asset-change-commit" key={log.id}>
                        <span className="asset-change-commit-dot">
                          <FiClock />
                        </span>
                        <div className="asset-change-commit-card">
                          <header>
                            <div>
                              <strong>{ASSET_AUDIT_ACTION_LABELS[log.action] || log.action}</strong>
                              <span>{log.summary || "Thông tin tài sản được cập nhật"}</span>
                            </div>
                            <time>{dateTimeLabel(log.occurredAt)}</time>
                          </header>
                          <p className="asset-change-actor">
                            {log.actorEmployeeId
                              ? employeeName(log.actorEmployeeId)
                              : log.actorUsername || "Hệ thống"}
                            {log.actorRole ? ` · ${log.actorRole}` : ""}
                          </p>
                          <div className="asset-change-diff-list">
                            {Object.entries(log.changedFields || {}).map(([field, change]) => (
                              <div className="asset-change-diff" key={field}>
                                <b>{ASSET_AUDIT_FIELD_LABELS[field] || field}</b>
                                <div>
                                  <del>
                                    <span>{assetAuditValue(field, change.before)}</span>
                                  </del>
                                  <ins>
                                    <span>{assetAuditValue(field, change.after)}</span>
                                  </ins>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="modal-actions asset-detail-actions">
              <button
                type="button"
                className="secondary"
                onClick={closeAssetDetail}
                disabled={assetSaving}
              >
                Đóng
              </button>
              {canManage && assetDetailView === "details" && (
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => void handleSaveAsset()}
                  disabled={assetSaving || !assetDraftChanged}
                >
                  Lưu thay đổi
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {qrAsset && (
        <div className="modal-backdrop">
          <div className="crud-modal asset-qr-modal">
            <div className="modal-head">
              <div className="modal-title-group">
                <span className="modal-title-icon create">
                  <FiGrid />
                </span>
                <div>
                  <h2>Mã QR tài sản</h2>
                  <p>{qrAsset.assetCode}</p>
                </div>
              </div>
              <button type="button" className="icon-button" onClick={closeAssetQr}>
                <FiX />
              </button>
            </div>
            <div className="asset-qr-preview">
              {qrBusy ? (
                <span>Đang tạo mã QR...</span>
              ) : (
                <>
                  <img
                    className="asset-qr-image"
                    aria-label={`Mã QR của ${qrAsset.assetCode}`}
                    src={qrSvg}
                  />
                  <strong>{qrAsset.name}</strong>
                  <small>Quét mã để xem thông tin của tài sản này.</small>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={closeAssetQr}>
                Đóng
              </button>
              <button
                type="button"
                className="primary-action"
                disabled={!qrCode || qrBusy}
                onClick={() => void handlePrintCurrentQr()}
              >
                In QR
              </button>
            </div>
          </div>
        </div>
      )}

      {importOpen && (
        <div className="modal-backdrop">
          <div className="crud-modal asset-import-modal">
            <div className="modal-head">
              <div className="modal-title-group">
                <span className="modal-title-icon create">
                  <FiFileText />
                </span>
                <div>
                  <h2>Tải danh sách tài sản</h2>
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
                  <input type="file" accept=".xlsx,.xls" onChange={handleImportFile} />
                </label>
                <div className="asset-import-file-meta">
                  <strong>{importFileName || "Chưa chọn file Excel"}</strong>
                  <small>Hỗ trợ sheet Thiết bị, định dạng .xlsx hoặc .xls</small>
                </div>
              </div>

              <div className="asset-import-summary">
                <div>
                  <span>Dòng đã đọc</span>
                  <strong>{importRows.length}</strong>
                </div>
                <div>
                  <span>Hợp lệ</span>
                  <strong>{importResult?.validRows ?? "--"}</strong>
                </div>
                <div>
                  <span>Lỗi</span>
                  <strong>{importResult?.errorRows ?? "--"}</strong>
                </div>
                <div>
                  <span>Cảnh báo</span>
                  <strong>{importResult?.warningRows ?? "--"}</strong>
                </div>
              </div>

              <div className="asset-import-controls">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div className="asset-import-options">
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                      <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 600 }}>
                        Chế độ nhập dữ liệu:
                      </span>
                      <SearchableSelect
                        value={importMode}
                        onChange={(val: string) => setImportMode(val as ImportMode)}
                        style={{
                          width: "200px",
                        }}
                      >
                        <option value="VALID_ROWS_ONLY">Chỉ nhập những dòng hợp lệ</option>
                        <option value="ALL_OR_NOTHING">Tất cả hoặc không nhập</option>
                      </SearchableSelect>
                    </label>
                  </div>

                  <div
                    className="asset-import-preview-toolbar"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 600 }}>
                      Trạng thái dòng:
                    </span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        data-active={importPreviewFilter === "ALL" ? "true" : undefined}
                        onClick={() => setImportPreviewFilter("ALL")}
                      >
                        Tất cả <strong>{importResult?.totalRows ?? importRows.length}</strong>
                      </button>
                      <button
                        type="button"
                        data-active={importPreviewFilter === "VALID" ? "true" : undefined}
                        disabled={!importResult}
                        onClick={() => setImportPreviewFilter("VALID")}
                      >
                        Hợp lệ <strong>{importResult?.validRows ?? 0}</strong>
                      </button>
                      <button
                        type="button"
                        data-active={importPreviewFilter === "INVALID" ? "true" : undefined}
                        disabled={!importResult}
                        onClick={() => setImportPreviewFilter("INVALID")}
                      >
                        Lỗi <strong>{importResult?.errorRows ?? 0}</strong>
                      </button>
                      <button
                        type="button"
                        data-active={importPreviewFilter === "WARNING" ? "true" : undefined}
                        disabled={!importResult}
                        onClick={() => setImportPreviewFilter("WARNING")}
                      >
                        Cảnh báo <strong>{importResult?.warningRows ?? 0}</strong>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="asset-import-preview">
                <table>
                  <thead>
                    <tr>
                      <th>Dòng</th>
                      <th>Tài sản</th>
                      <th>Số lượng</th>
                      <th>Mã hợp đồng</th>
                      <th>Số hóa đơn</th>
                      <th>Loại tài sản</th>
                      <th>Phân loại</th>
                      <th>Loại con</th>
                      <th>Phòng ban</th>
                      <th>Chi nhánh</th>
                      <th>Serial/MAC</th>
                      <th>Ngày mua</th>
                      <th>Đơn giá</th>
                      <th>Trạng thái</th>
                      <th>Ghi chú kiểm tra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.length === 0 || importPreviewRows.length === 0 ? (
                      <tr className="asset-table-empty-row">
                        <td colSpan={15}>
                          <div className="asset-table-empty-state">
                            {importRows.length === 0
                              ? "Chọn file Excel để xem dữ liệu trước khi import."
                              : "Không có dòng phù hợp bộ lọc."}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      importPreviewRows.map((row) => {
                        const isResultRow = "errors" in row;
                        const source: AssetImportRowPayload | undefined = isResultRow
                          ? importRows.find((item) => item.rowNumber === row.rowNumber)
                          : row;
                        const status = isResultRow ? row.status : undefined;
                        const rowMessages = isResultRow
                          ? [...row.errors, ...row.warnings].map((item) => item.message)
                          : [];
                        return (
                          <tr key={row.rowNumber} data-status={status}>
                            <td>{row.rowNumber}</td>
                            <td>
                              <div className="asset-name-cell">
                                <strong>
                                  {isResultRow ? row.assetName : source?.name || "--"}
                                </strong>
                              </div>
                            </td>
                            <td>{source?.quantity ?? 1}</td>
                            <td>{source?.contractNumber || "--"}</td>
                            <td>{source?.invoiceNumber || "--"}</td>
                            <td>{isResultRow ? row.categoryCode : source?.categoryCode}</td>
                            <td>{source?.assetClass || "--"}</td>
                            <td>{source?.classType || "--"}</td>
                            <td>{source?.departmentName || "--"}</td>
                            <td>{source?.siteName || "--"}</td>
                            <td>{source?.serialNumber || "--"}</td>
                            <td>{source?.purchaseDate || "--"}</td>
                            <td>
                              {source?.originalCost ? money.format(source.originalCost) : "--"}
                            </td>
                            <td>
                              {status ? (
                                <StatusBadge value={status} label={importStatusLabel(status)} />
                              ) : source?.status ? (
                                <StatusBadge value={source.status} />
                              ) : (
                                "--"
                              )}
                            </td>
                            <td className="asset-import-message-cell">
                              {rowMessages.length > 0 ? (
                                <span
                                  className="asset-import-message-summary"
                                  onMouseEnter={(event) => showImportTooltip(event, rowMessages)}
                                  onMouseLeave={() => setImportTooltip(null)}
                                >
                                  - {rowMessages[0]}
                                  {rowMessages.length > 1 ? ` (+${rowMessages.length - 1})` : ""}
                                </span>
                              ) : (
                                "--"
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {importTooltip && (
              <div
                className="asset-import-floating-tooltip"
                style={{ left: importTooltip.x, top: importTooltip.y }}
              >
                {importTooltip.text}
              </div>
            )}

            <div className="modal-actions asset-import-actions">
              <button
                type="button"
                className="secondary"
                onClick={requestCloseImport}
                disabled={importBusy}
              >
                Hủy
              </button>
              {importResult && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => downloadImportCsv(importResult, importRows)}
                  disabled={importBusy}
                >
                  <FiDownload /> Tải kết quả
                </button>
              )}
              <button
                type="button"
                className="secondary"
                onClick={handleValidateImport}
                disabled={importBusy || importRows.length === 0}
              >
                Kiểm tra dữ liệu
              </button>
              <button
                type="button"
                className="primary-action"
                onClick={handleCommitImport}
                disabled={importBusy || !canCommitImport}
              >
                Import
              </button>
            </div>

            {importCancelConfirm && (
              <div className="asset-import-confirm">
                <div className="asset-import-confirm-card">
                  <div className="asset-import-confirm-icon">
                    <FiX />
                  </div>
                  <div className="asset-import-confirm-content">
                    <strong>Hủy phiên nhập tài sản?</strong>
                    <p>
                      File đã chọn, dữ liệu preview và kết quả kiểm tra hiện tại sẽ bị xóa khỏi màn
                      hình.
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
    </section>
  );
}
