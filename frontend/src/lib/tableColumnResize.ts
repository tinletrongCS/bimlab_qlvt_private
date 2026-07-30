const EDGE_SIZE = 8;
const MIN_WIDTH = 48;

function headerAtResizeEdge(event: MouseEvent, root: HTMLElement): HTMLTableCellElement | null {
  if (!(event.target instanceof Element)) return null;
  const header = event.target.closest("th");
  if (!(header instanceof HTMLTableCellElement) || !root.contains(header)) return null;
  if (
    header.dataset.columnResize === "locked" ||
    header.classList.contains("asset-table-actions-col") ||
    header.classList.contains("booking-table-actions-col") ||
    header.textContent?.trim() === "Thao tác"
  )
    return null;
  const rect = header.getBoundingClientRect();
  return rect.right - event.clientX >= 0 && rect.right - event.clientX <= EDGE_SIZE ? header : null;
}

function syncStickyOffsets(table: HTMLTableElement) {
  const headers = table.tHead?.rows[0]?.cells;
  if (!headers) return;

  let left = 0;
  Array.from(headers).forEach((header, index) => {
    if (
      !header.classList.contains("asset-table-sticky-left") &&
      !header.classList.contains("asset-table-sticky-select") &&
      !header.classList.contains("booking-table-sticky-left")
    )
      return;
    Array.from(table.rows).forEach((row) => {
      row.cells[index]?.style.setProperty("left", `${left}px`, "important");
    });
    left += header.getBoundingClientRect().width;
  });
}

function setColumnWidth(table: HTMLTableElement, columnIndex: number, width: number) {
  const value = `${Math.max(MIN_WIDTH, Math.ceil(width))}px`;
  Array.from(table.rows).forEach((row) => {
    const cell = row.cells[columnIndex];
    cell?.style.setProperty("width", value, "important");
    cell?.style.setProperty("min-width", value, "important");
    cell?.style.setProperty("max-width", value, "important");
  });
}

function freezeTableColumns(table: HTMLTableElement): number[] {
  const headers = Array.from(table.tHead?.rows[0]?.cells || []);
  const widths = headers.map((header) => header.getBoundingClientRect().width);
  widths.forEach((width, index) => {
    setColumnWidth(table, index, width);
  });
  setTableWidth(table, widths);
  return widths;
}

function setTableWidth(table: HTMLTableElement, widths: number[]) {
  const contentWidth = widths.reduce((total, value) => total + value, 0);
  const width = `${Math.ceil(Math.max(contentWidth, table.parentElement?.clientWidth || 0))}px`;
  table.style.setProperty("width", width, "important");
  table.style.setProperty("min-width", width, "important");
}

function fitCurrentPageWidth(header: HTMLTableCellElement): number {
  const table = header.closest("table");
  const parent = table?.parentElement;
  if (!table || !parent) return header.getBoundingClientRect().width;

  const clone = table.cloneNode(true) as HTMLTableElement;
  clone.setAttribute("aria-hidden", "true");
  clone.style.setProperty("position", "absolute", "important");
  clone.style.setProperty("visibility", "hidden", "important");
  clone.style.setProperty("table-layout", "auto", "important");
  clone.style.setProperty("width", "max-content", "important");
  clone.style.setProperty("min-width", "0", "important");

  const cloneRows = Array.from(clone.rows);
  Array.from(table.rows).forEach((row, index) => {
    if (
      row.hidden ||
      row.getAttribute("aria-hidden") === "true" ||
      getComputedStyle(row).display === "none"
    )
      cloneRows[index]?.remove();
  });
  Array.from(clone.rows).forEach((row) => {
    Array.from(row.cells).forEach((cell) => {
      cell.style.setProperty("width", "auto", "important");
      cell.style.setProperty("min-width", "0", "important");
      cell.style.setProperty("max-width", "none", "important");
      cell.style.removeProperty("left");
      cell.style.removeProperty("right");
    });
  });

  parent.appendChild(clone);
  const width = Math.max(
    ...Array.from(
      clone.rows,
      (row) => row.cells[header.cellIndex]?.getBoundingClientRect().width || 0,
    ),
  );
  clone.remove();
  return width || header.getBoundingClientRect().width;
}

function applyWidths(table: HTMLTableElement, widths: number[]) {
  widths.forEach((width, index) => {
    setColumnWidth(table, index, width);
  });
  setTableWidth(table, widths);
  syncStickyOffsets(table);
}

export function enableTableColumnResize(root: HTMLElement): () => void {
  let stopDrag = () => {};

  const handleMouseDown = (event: MouseEvent) => {
    const header = headerAtResizeEdge(event, root);
    if (!header) return;

    event.preventDefault();
    event.stopPropagation();
    stopDrag();

    const table = header.closest("table");
    if (!table) return;
    const startX = event.clientX;
    const widths = freezeTableColumns(table);
    const startWidth = widths[header.cellIndex];
    const handleMouseMove = (moveEvent: MouseEvent) => {
      widths[header.cellIndex] = Math.max(MIN_WIDTH, startWidth + moveEvent.clientX - startX);
      applyWidths(table, widths);
    };
    const handleMouseUp = () => stopDrag();

    stopDrag = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove("is-resizing-table-column");
      stopDrag = () => {};
    };

    document.body.classList.add("is-resizing-table-column");
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleDoubleClick = (event: MouseEvent) => {
    const header = headerAtResizeEdge(event, root);
    if (!header) return;
    event.preventDefault();
    event.stopPropagation();
    const table = header.closest("table");
    if (!table) return;
    const width = fitCurrentPageWidth(header);
    const widths = freezeTableColumns(table);
    widths[header.cellIndex] = width;
    applyWidths(table, widths);
  };

  root.addEventListener("mousedown", handleMouseDown);
  root.addEventListener("dblclick", handleDoubleClick);
  return () => {
    stopDrag();
    root.removeEventListener("mousedown", handleMouseDown);
    root.removeEventListener("dblclick", handleDoubleClick);
  };
}
