import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from "react-icons/fi";

interface Column<T> {
  key: string;
  title: string;
  render: (item: T) => ReactNode;
  className?: string;
}

type RowKey = string | number;

interface DataTableSelection<T> {
  selectedKeys: ReadonlySet<RowKey>;
  onChange: (keys: Set<RowKey>) => void;
  getLabel?: (item: T) => string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyText: string;
  getRowKey?: (item: T, index: number) => string | number;
  pageSizeOptions?: number[];
  itemLabel?: string;
  pagination?: boolean;
  tableMinWidth?: number;
  selection?: DataTableSelection<T>;
}

export function DataTable<T>({
  columns,
  data,
  emptyText,
  getRowKey,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = "mục",
  pagination = true,
  tableMinWidth,
  selection,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeOptions[0] ?? 10);
  const pageCount = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = data.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, data.length);
  const visibleData = useMemo(
    () => (pagination ? data.slice((safePage - 1) * pageSize, safePage * pageSize) : data),
    [data, pageSize, pagination, safePage],
  );
  const visibleRows = visibleData.map((item, index) => {
    const absoluteIndex = (safePage - 1) * pageSize + index;
    return {
      item,
      absoluteIndex,
      key: getRowKey ? getRowKey(item, absoluteIndex) : absoluteIndex,
    };
  });
  const visibleKeys = visibleRows.map((row) => row.key);
  const selectedVisibleCount = selection
    ? visibleKeys.filter((key) => selection.selectedKeys.has(key)).length
    : 0;
  const allVisibleSelected = visibleKeys.length > 0 && selectedVisibleCount === visibleKeys.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  useEffect(() => {
    setPage(1);
  }, [data, pageSize]);

  return (
    <>
      <div
        className={`table-wrap${selection ? " has-row-selection" : ""}`}
        style={
          tableMinWidth
            ? ({ "--qlvt-table-min-width": `${tableMinWidth}px` } as CSSProperties)
            : undefined
        }
      >
        <table>
          <thead>
            <tr>
              {selection && (
                <th className="data-table-select-column">
                  <label className="asset-table-checkbox" title="Chọn các dòng trên trang hiện tại">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someVisibleSelected;
                      }}
                      onChange={() => {
                        const next = new Set(selection.selectedKeys);
                        visibleKeys.forEach((key) => {
                          if (allVisibleSelected) next.delete(key);
                          else next.add(key);
                        });
                        selection.onChange(next);
                      }}
                    />
                    <span />
                  </label>
                </th>
              )}
              <th className="table-index-header">STT</th>
              {columns.map((column) => (
                <th key={column.key} className={column.className}>
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td className="empty" colSpan={columns.length + 1 + (selection ? 1 : 0)}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              visibleRows.map(({ item, absoluteIndex, key }) => (
                <tr
                  key={key}
                  className={selection?.selectedKeys.has(key) ? "is-selected" : undefined}
                >
                  {selection && (
                    <td className="data-table-select-column">
                      <label
                        className="asset-table-checkbox"
                        title={`Chọn ${selection.getLabel?.(item) || "dòng này"}`}
                      >
                        <input
                          type="checkbox"
                          checked={selection.selectedKeys.has(key)}
                          onChange={() => {
                            const next = new Set(selection.selectedKeys);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            selection.onChange(next);
                          }}
                        />
                        <span />
                      </label>
                    </td>
                  )}
                  <td className="table-index-cell">{absoluteIndex + 1}</td>
                  {columns.map((column) => (
                    <td key={column.key} className={column.className}>
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && data.length > 0 && (
        <div className="table-pagination">
          <div className="table-pagination-summary">
            Hiển thị{" "}
            <strong>
              {start}-{end}
            </strong>{" "}
            / <strong>{data.length}</strong> {itemLabel}
          </div>
          <div className="table-pagination-controls">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              aria-label="Số dòng mỗi trang"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}/trang
                </option>
              ))}
            </select>
            <button type="button" onClick={() => setPage(1)} disabled={safePage <= 1}>
              <FiChevronsLeft />
            </button>
            <button type="button" onClick={() => setPage(safePage - 1)} disabled={safePage <= 1}>
              <FiChevronLeft />
            </button>
            <span>
              {safePage} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(safePage + 1)}
              disabled={safePage >= pageCount}
            >
              <FiChevronRight />
            </button>
            <button
              type="button"
              onClick={() => setPage(pageCount)}
              disabled={safePage >= pageCount}
            >
              <FiChevronsRight />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
