import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiLogIn,
  FiLogOut,
  FiRefreshCw,
  FiRotateCcw,
  FiSearch,
  FiSettings,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import { DataTable } from "../components/DataTable";
import { OverflowActions } from "../components/OverflowActions";
import { useAuth } from "../contexts/AuthContext";
import {
  cancelAssetBooking,
  checkAssetBookingAvailability,
  checkInAssetBooking,
  checkOutAssetBooking,
  createAssetBooking,
  loadAssetBookings,
  loadAssets,
} from "../services/api";
import type {
  AssetBooking,
  AssetBookingAvailability,
  AssetBookingPayload,
  AssetItem,
} from "../services/types";

type BookingAction = "check-in" | "check-out" | "cancel";
type BookingCalendarView = "day" | "week" | "month";
interface TimedBookingLayout {
  booking: AssetBooking;
  top: number;
  height: number;
  column: number;
  columnCount: number;
}
type BookingTableColumnId =
  | "booking"
  | "asset"
  | "time"
  | "status"
  | "owner"
  | "purpose"
  | "department"
  | "site"
  | "project"
  | "autoRelease"
  | "checked"
  | "createdBy"
  | "updatedAt"
  | "actions";

interface BookingTableColumnConfig {
  id: BookingTableColumnId;
  label: string;
  locked?: boolean;
  defaultVisible?: boolean;
}

interface BookingTableColumnDefinition extends BookingTableColumnConfig {
  render: (item: AssetBooking) => ReactNode;
}

const BOOKING_STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "IN_USE", label: "Đang sử dụng" },
  { value: "COMPLETED", label: "Hoàn tất" },
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "EXPIRED", label: "Quá hạn" },
];

const BOOKING_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING_APPROVAL: "Chờ duyệt",
  CONFIRMED: "Đã xác nhận",
  IN_USE: "Đang sử dụng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  REJECTED: "Từ chối",
  EXPIRED: "Quá hạn",
};

const EMPTY_FORM = {
  assetCode: "",
  title: "",
  purpose: "",
  startTime: "",
  endTime: "",
  requestedByEmployeeId: "",
  departmentId: "",
  siteId: "",
  projectId: "",
  autoRelease: true,
  notes: "",
};

const BOOKING_TABLE_STORAGE_KEY = "qlvt.bookingList.tableColumns.v2";
const BOOKING_TABLE_COLUMNS: BookingTableColumnConfig[] = [
  { id: "booking", label: "Phiên đặt lịch", locked: true, defaultVisible: true },
  { id: "asset", label: "Phòng họp", locked: true, defaultVisible: true },
  { id: "status", label: "Trạng thái", defaultVisible: true },
  { id: "time", label: "Khung giờ", defaultVisible: true },
  { id: "owner", label: "Phụ trách", defaultVisible: true },
  { id: "purpose", label: "Mục đích", defaultVisible: false },
  { id: "department", label: "Phòng ban", defaultVisible: false },
  { id: "site", label: "Chi nhánh", defaultVisible: false },
  { id: "project", label: "Dự án", defaultVisible: false },
  { id: "autoRelease", label: "Tự động trả phòng", defaultVisible: false },
  { id: "checked", label: "Nhận / trả phòng", defaultVisible: false },
  { id: "createdBy", label: "Người tạo", defaultVisible: false },
  { id: "updatedAt", label: "Cập nhật", defaultVisible: false },
  { id: "actions", label: "Thao tác", locked: true, defaultVisible: true },
];
const BOOKING_TABLE_COLUMN_WIDTHS: Record<BookingTableColumnId, number> = {
  booking: 230,
  asset: 230,
  time: 260,
  status: 140,
  owner: 170,
  purpose: 190,
  department: 170,
  site: 160,
  project: 160,
  autoRelease: 170,
  checked: 170,
  createdBy: 160,
  updatedAt: 170,
  actions: 86,
};
const BOOKING_TABLE_MIN_SCROLL_WIDTH = 1420;
const BOOKING_TABLE_COLUMN_IDS = BOOKING_TABLE_COLUMNS.map((column) => column.id);
const DEFAULT_BOOKING_TABLE_VISIBLE_COLUMNS = BOOKING_TABLE_COLUMNS.filter(
  (column) => column.defaultVisible || column.locked,
).map((column) => column.id);
const BOOKING_HOUR_HEIGHT = 52;
const BOOKING_HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const BOOKING_LOCKED_COLUMN_ORDER: BookingTableColumnId[] = ["booking", "asset", "actions"];

function normalizeBookingColumnOrder(order: BookingTableColumnId[]) {
  const middleColumns = [
    ...order.filter(
      (id) => BOOKING_TABLE_COLUMN_IDS.includes(id) && !BOOKING_LOCKED_COLUMN_ORDER.includes(id),
    ),
    ...BOOKING_TABLE_COLUMN_IDS.filter(
      (id) => !order.includes(id) && !BOOKING_LOCKED_COLUMN_ORDER.includes(id),
    ),
  ];
  return ["booking", "asset", ...middleColumns, "actions"] as BookingTableColumnId[];
}

function readBookingColumnPreferences() {
  if (typeof window === "undefined") {
    return {
      order: normalizeBookingColumnOrder(BOOKING_TABLE_COLUMN_IDS),
      visible: DEFAULT_BOOKING_TABLE_VISIBLE_COLUMNS,
    };
  }

  try {
    const raw = window.localStorage.getItem(BOOKING_TABLE_STORAGE_KEY);
    if (!raw) {
      return {
        order: normalizeBookingColumnOrder(BOOKING_TABLE_COLUMN_IDS),
        visible: DEFAULT_BOOKING_TABLE_VISIBLE_COLUMNS,
      };
    }
    const parsed = JSON.parse(raw) as Partial<{
      order: BookingTableColumnId[];
      visible: BookingTableColumnId[];
    }>;
    const knownIds = new Set(BOOKING_TABLE_COLUMN_IDS);
    const order = [
      ...(parsed.order || []).filter((id): id is BookingTableColumnId => knownIds.has(id)),
      ...BOOKING_TABLE_COLUMN_IDS.filter((id) => !(parsed.order || []).includes(id)),
    ];
    const visible = Array.from(
      new Set([
        ...(parsed.visible || []).filter((id): id is BookingTableColumnId => knownIds.has(id)),
        ...BOOKING_TABLE_COLUMNS.filter((column) => column.locked).map((column) => column.id),
      ]),
    );
    return { order: normalizeBookingColumnOrder(order), visible };
  } catch {
    return {
      order: normalizeBookingColumnOrder(BOOKING_TABLE_COLUMN_IDS),
      visible: DEFAULT_BOOKING_TABLE_VISIBLE_COLUMNS,
    };
  }
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function formatDateTime(value?: string) {
  if (!value) return "--";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWeekdayShort(value: Date) {
  const labels = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  return labels[value.getDay()];
}

function formatShortDate(value: Date) {
  return value.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function formatCalendarTitle(value: Date, view: BookingCalendarView) {
  if (view === "day") {
    return value.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
  if (view === "week") {
    const start = startOfWeek(value);
    const end = addDays(start, 6);
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  }
  return value.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(value: Date, amount: number) {
  const next = new Date(value);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function startOfWeek(value: Date) {
  const dayOffset = (value.getDay() + 6) % 7;
  return addDays(startOfDay(value), -dayOffset);
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function bookingDate(value: AssetBooking) {
  const date = new Date(value.startTime);
  return Number.isNaN(date.getTime()) ? null : date;
}

function bookingTimeRange(value: AssetBooking) {
  const start = new Date(value.startTime);
  const end = new Date(value.endTime);
  const startLabel = Number.isNaN(start.getTime())
    ? "--"
    : start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const endLabel = Number.isNaN(end.getTime())
    ? "--"
    : end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${startLabel} - ${endLabel}`;
}

function formatHourLabel(hour: number) {
  const value = hour % 12 || 12;
  return `${value}${hour < 12 ? "AM" : "PM"}`;
}

function minutesSinceDayStart(value: Date) {
  return value.getHours() * 60 + value.getMinutes();
}

function bookingTimeBlockStyle(booking: AssetBooking) {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { top: 0, height: 28 };
  }
  const startMinutes = Math.max(0, Math.min(1439, minutesSinceDayStart(start)));
  const rawEndMinutes = isSameDay(start, end) ? minutesSinceDayStart(end) : 1440;
  const endMinutes = Math.max(startMinutes + 15, Math.min(1440, rawEndMinutes));
  return {
    top: (startMinutes / 60) * BOOKING_HOUR_HEIGHT,
    height: Math.max(28, ((endMinutes - startMinutes) / 60) * BOOKING_HOUR_HEIGHT),
  };
}

function buildTimedBookingLayouts(bookings: AssetBooking[]): TimedBookingLayout[] {
  const entries = bookings
    .map((booking) => {
      const style = bookingTimeBlockStyle(booking);
      return {
        booking,
        top: Number(style.top),
        height: Number(style.height),
      };
    })
    .sort((a, b) => a.top - b.top || a.height - b.height);

  const result: TimedBookingLayout[] = [];
  let cluster: typeof entries = [];
  let clusterEnd = 0;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const columnEnds: number[] = [];
    const clusterLayouts = cluster.map((entry) => {
      const freeColumn = columnEnds.findIndex((end) => end <= entry.top + 1);
      const column = freeColumn >= 0 ? freeColumn : columnEnds.length;
      columnEnds[column] = entry.top + entry.height;
      return {
        booking: entry.booking,
        top: entry.top,
        height: entry.height,
        column,
        columnCount: 1,
      };
    });
    const columnCount = Math.max(columnEnds.length, 1);
    clusterLayouts.forEach((layout) => {
      result.push({ ...layout, columnCount });
    });
    cluster = [];
    clusterEnd = 0;
  };

  entries.forEach((entry) => {
    if (cluster.length > 0 && entry.top >= clusterEnd) {
      flushCluster();
    }
    cluster.push(entry);
    clusterEnd = Math.max(clusterEnd, entry.top + entry.height);
  });
  flushCluster();

  return result;
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string; error?: string } } })
      .response;
    return response?.data?.message || response?.data?.error || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function actionLabel(action: BookingAction) {
  if (action === "check-in") return "nhận phòng";
  if (action === "check-out") return "trả phòng";
  return "hủy lịch đặt";
}

function canCheckIn(booking: AssetBooking) {
  return booking.status === "CONFIRMED";
}

function canCheckOut(booking: AssetBooking) {
  return booking.status === "CONFIRMED" || booking.status === "IN_USE";
}

function canCancel(booking: AssetBooking) {
  return !["COMPLETED", "CANCELLED", "REJECTED"].includes(booking.status);
}

function BookingStatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      {BOOKING_STATUS_LABELS[status] || status}
    </span>
  );
}

export function BookingPage() {
  const { user } = useAuth();
  const timeGridScrollRef = useRef<HTMLDivElement | null>(null);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [bookings, setBookings] = useState<AssetBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    assetCode: "",
    status: "",
    fromTime: "",
    toTime: "",
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [availability, setAvailability] = useState<AssetBookingAvailability | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<AssetBooking | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: BookingAction;
    booking: AssetBooking;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [bookingColumnOrder, setBookingColumnOrder] = useState<BookingTableColumnId[]>(
    () => readBookingColumnPreferences().order,
  );
  const [visibleBookingColumns, setVisibleBookingColumns] = useState<BookingTableColumnId[]>(
    () => readBookingColumnPreferences().visible,
  );
  const [bookingColumnConfigOpen, setBookingColumnConfigOpen] = useState(false);
  const [draggedBookingColumn, setDraggedBookingColumn] = useState<BookingTableColumnId | null>(
    null,
  );
  const [calendarView, setCalendarView] = useState<BookingCalendarView>("week");
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  const assetOptions = useMemo(
    () =>
      assets
        .slice()
        .sort((a, b) => `${a.assetCode} ${a.name}`.localeCompare(`${b.assetCode} ${b.name}`)),
    [assets],
  );

  const selectedFilterAsset = useMemo(
    () => assetOptions.find((asset) => asset.assetCode === filters.assetCode),
    [assetOptions, filters.assetCode],
  );

  const bookingStats = useMemo(
    () => ({
      total: bookings.length,
      confirmed: bookings.filter((item) => item.status === "CONFIRMED").length,
      inUse: bookings.filter((item) => item.status === "IN_USE").length,
      completed: bookings.filter((item) => item.status === "COMPLETED").length,
    }),
    [bookings],
  );

  const loadBookings = async () => {
    const data = await loadAssetBookings({
      assetId: selectedFilterAsset?.id,
      status: filters.status || undefined,
      fromTime: filters.fromTime || undefined,
      toTime: filters.toTime || undefined,
    });
    setBookings(data);
  };

  useEffect(() => {
    let cancelled = false;
    async function loadInitialData() {
      setLoading(true);
      try {
        const assetData = await loadAssets();
        if (!cancelled) setAssets(assetData);
      } catch (error) {
        if (!cancelled) toast.error(errorMessage(error, "Không tải được danh sách tài sản."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadInitialData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    async function refreshBookings() {
      try {
        const data = await loadAssetBookings({
          assetId: selectedFilterAsset?.id,
          status: filters.status || undefined,
          fromTime: filters.fromTime || undefined,
          toTime: filters.toTime || undefined,
        });
        if (!cancelled) setBookings(data);
      } catch (error) {
        if (!cancelled) toast.error(errorMessage(error, "Không tải được lịch đặt phòng."));
      }
    }
    void refreshBookings();
    return () => {
      cancelled = true;
    };
  }, [filters.fromTime, filters.status, filters.toTime, loading, selectedFilterAsset?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      BOOKING_TABLE_STORAGE_KEY,
      JSON.stringify({
        order: bookingColumnOrder,
        visible: visibleBookingColumns,
      }),
    );
  }, [bookingColumnOrder, visibleBookingColumns]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setAvailability(null);
  };

  const handleCheckAvailability = async () => {
    if (!form.assetCode || !form.startTime || !form.endTime) {
      toast.error("Chọn phòng họp và khung giờ trước khi kiểm tra.");
      return null;
    }

    setSubmitting(true);
    try {
      const result = await checkAssetBookingAvailability({
        assetCode: form.assetCode,
        startTime: form.startTime,
        endTime: form.endTime,
      });
      setAvailability(result);
      if (result.available) {
        toast.success("Khung giờ này có thể đặt.");
      } else {
        toast.error(result.reason || "Khung giờ không khả dụng.");
      }
      return result;
    } catch (error) {
      toast.error(errorMessage(error, "Không kiểm tra được lịch phòng."));
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBooking = async () => {
    if (!form.assetCode || !form.title || !form.startTime || !form.endTime) {
      toast.error("Nhập đủ phòng họp, tiêu đề và khung giờ.");
      return;
    }

    const result =
      availability?.assetCode === form.assetCode &&
      availability.startTime === form.startTime &&
      availability.endTime === form.endTime
        ? availability
        : await handleCheckAvailability();

    if (!result?.available) return;

    const payload: AssetBookingPayload = {
      assetCode: form.assetCode,
      title: form.title.trim(),
      purpose: form.purpose.trim() || undefined,
      startTime: form.startTime,
      endTime: form.endTime,
      requestedByEmployeeId: toNullableNumber(form.requestedByEmployeeId),
      departmentId: toNullableNumber(form.departmentId),
      siteId: toNullableNumber(form.siteId),
      projectId: toNullableNumber(form.projectId),
      autoRelease: form.autoRelease,
      notes: form.notes.trim() || undefined,
      createdBy: user?.username,
    };

    setSubmitting(true);
    try {
      await createAssetBooking(payload);
      toast.success("Đã tạo lịch đặt phòng.");
      resetForm();
      await loadBookings();
    } catch (error) {
      toast.error(errorMessage(error, "Backend tạo booking đang chờ hoàn thiện."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === "cancel" && !cancelReason.trim()) {
      toast.error("Nhập lý do hủy lịch.");
      return;
    }

    setSubmitting(true);
    try {
      if (confirmAction.type === "check-in") {
        await checkInAssetBooking(confirmAction.booking.id);
      } else if (confirmAction.type === "check-out") {
        await checkOutAssetBooking(confirmAction.booking.id, {
          completedBy: user?.username,
          notes: "Trả phòng từ giao diện booking",
        });
      } else {
        await cancelAssetBooking(confirmAction.booking.id, {
          cancelledBy: user?.username || "unknown",
          cancelReason: cancelReason.trim(),
        });
      }
      toast.success(`Đã ${actionLabel(confirmAction.type)}.`);
      setConfirmAction(null);
      setCancelReason("");
      await loadBookings();
    } catch (error) {
      toast.error(
        errorMessage(error, `Backend ${actionLabel(confirmAction.type)} đang chờ hoàn thiện.`),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleBookingColumn = (id: BookingTableColumnId) => {
    const column = BOOKING_TABLE_COLUMNS.find((item) => item.id === id);
    if (column?.locked) return;
    setVisibleBookingColumns((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const resetBookingColumns = () => {
    setBookingColumnOrder(normalizeBookingColumnOrder(BOOKING_TABLE_COLUMN_IDS));
    setVisibleBookingColumns(DEFAULT_BOOKING_TABLE_VISIBLE_COLUMNS);
  };

  const dropBookingColumn = (targetId: BookingTableColumnId) => {
    if (!draggedBookingColumn || draggedBookingColumn === targetId) return;
    const draggedColumn = BOOKING_TABLE_COLUMNS.find((item) => item.id === draggedBookingColumn);
    const targetColumn = BOOKING_TABLE_COLUMNS.find((item) => item.id === targetId);
    if (draggedColumn?.locked || targetColumn?.locked) {
      setDraggedBookingColumn(null);
      return;
    }
    setBookingColumnOrder((current) => {
      const withoutDragged = current.filter((id) => id !== draggedBookingColumn);
      const targetIndex = withoutDragged.indexOf(targetId);
      if (targetIndex < 0) return current;
      return normalizeBookingColumnOrder([
        ...withoutDragged.slice(0, targetIndex),
        draggedBookingColumn,
        ...withoutDragged.slice(targetIndex),
      ]);
    });
    setDraggedBookingColumn(null);
  };

  const bookingTableColumns: BookingTableColumnDefinition[] = [
    {
      id: "booking",
      label: "Phiên đặt lịch",
      locked: true,
      render: (item) => (
        <div className="asset-name-cell">
          <strong>{item.title}</strong>
          <span>{item.bookingCode}</span>
        </div>
      ),
    },
    {
      id: "asset",
      label: "Phòng họp",
      locked: true,
      render: (item) => (
        <div className="asset-muted-stack">
          <strong>{item.assetName || "--"}</strong>
          <span>{item.assetCode || `#${item.assetId}`}</span>
        </div>
      ),
    },
    {
      id: "time",
      label: "Khung giờ",
      render: (item) => (
        <div className="asset-muted-stack">
          <strong>{formatDateTime(item.startTime)}</strong>
          <span>{formatDateTime(item.endTime)}</span>
        </div>
      ),
    },
    {
      id: "status",
      label: "Trạng thái",
      render: (item) => <BookingStatusBadge status={item.status} />,
    },
    {
      id: "owner",
      label: "Phụ trách",
      render: (item) => item.requestedByEmployeeId || item.createdBy || "--",
    },
    {
      id: "purpose",
      label: "Mục đích",
      render: (item) => item.purpose || "--",
    },
    {
      id: "department",
      label: "Phòng ban",
      render: (item) => item.departmentId || "--",
    },
    {
      id: "site",
      label: "Chi nhánh",
      render: (item) => item.siteId || "--",
    },
    {
      id: "project",
      label: "Dự án",
      render: (item) => item.projectId || "--",
    },
    {
      id: "autoRelease",
      label: "Tự động trả phòng",
      render: (item) => (item.autoRelease ? "Có" : "Không"),
    },
    {
      id: "checked",
      label: "Nhận / trả phòng",
      render: (item) => (
        <div className="asset-muted-stack">
          <span>{formatDateTime(item.checkedInAt)}</span>
          <span>{formatDateTime(item.checkedOutAt)}</span>
        </div>
      ),
    },
    {
      id: "createdBy",
      label: "Người tạo",
      render: (item) => item.createdBy || "--",
    },
    {
      id: "updatedAt",
      label: "Cập nhật",
      render: (item) => formatDateTime(item.updatedAt),
    },
    {
      id: "actions",
      label: "Thao tác",
      locked: true,
      render: (item) => (
        <OverflowActions
          label={`Mở thao tác cho ${item.bookingCode}`}
          actions={[
            {
              label: "Xem chi tiết",
              onClick: () => setSelectedBooking(item),
            },
            {
              label: "Nhận phòng",
              disabled: !canCheckIn(item),
              onClick: () => setConfirmAction({ type: "check-in", booking: item }),
            },
            {
              label: "Trả phòng",
              disabled: !canCheckOut(item),
              onClick: () => setConfirmAction({ type: "check-out", booking: item }),
            },
            {
              label: "Hủy lịch",
              danger: true,
              disabled: !canCancel(item),
              onClick: () => setConfirmAction({ type: "cancel", booking: item }),
            },
          ]}
        />
      ),
    },
  ];
  const bookingColumnById = new Map(bookingTableColumns.map((column) => [column.id, column]));
  const visibleBookingColumnSet = new Set(visibleBookingColumns);
  const configuredBookingColumns = bookingColumnOrder
    .map((id) => bookingColumnById.get(id))
    .filter((column): column is BookingTableColumnDefinition => {
      if (!column) return false;
      return visibleBookingColumnSet.has(column.id) || Boolean(column.locked);
    });
  const bookingTableMinWidth = Math.max(
    BOOKING_TABLE_MIN_SCROLL_WIDTH,
    configuredBookingColumns.reduce(
      (total, column) => total + (BOOKING_TABLE_COLUMN_WIDTHS[column.id] ?? 150),
      0,
    ),
  );
  const bookingColumnConfigOrder = [
    ...bookingColumnOrder.filter((id) =>
      BOOKING_TABLE_COLUMNS.some((column) => column.id === id && column.locked),
    ),
    ...bookingColumnOrder.filter((id) =>
      BOOKING_TABLE_COLUMNS.some((column) => column.id === id && !column.locked),
    ),
  ];

  const calendarStep = calendarView === "month" ? "month" : "day";
  const moveCalendar = (direction: -1 | 1) => {
    setCalendarDate((current) =>
      calendarStep === "month"
        ? addMonths(current, direction)
        : addDays(current, direction * (calendarView === "week" ? 7 : 1)),
    );
  };
  const monthStart = startOfMonth(calendarDate);
  const monthGridStart = startOfWeek(monthStart);
  const monthDays = Array.from({ length: 42 }, (_, index) => addDays(monthGridStart, index));
  const calendarDays =
    calendarView === "month"
      ? monthDays
      : Array.from({ length: calendarView === "week" ? 7 : 1 }, (_, index) =>
          addDays(
            calendarView === "week" ? startOfWeek(calendarDate) : startOfDay(calendarDate),
            index,
          ),
        );

  useEffect(() => {
    if (calendarView === "month") return;
    const scrollEl = timeGridScrollRef.current;
    if (!scrollEl) return;
    const todayVisible = calendarDays.some((day) => isSameDay(day, new Date()));
    if (!todayVisible) return;
    const currentTop = (minutesSinceDayStart(new Date()) / 60) * BOOKING_HOUR_HEIGHT;
    const targetTop = Math.max(0, currentTop - scrollEl.clientHeight * 0.38);
    window.requestAnimationFrame(() => {
      scrollEl.scrollTop = targetTop;
    });
  }, [calendarDate, calendarDays, calendarView]);

  const bookingsForDay = (day: Date) =>
    bookings
      .filter((booking) => {
        const date = bookingDate(booking);
        return date ? isSameDay(date, day) : false;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <section className="booking-page page-grid">
      <div className="booking-hero panel">
        <div>
          <h2>Đặt lịch phòng họp</h2>
        </div>
        <div className="booking-hero-metrics">
          <div>
            <span>Tổng phiên</span>
            <strong>{bookingStats.total}</strong>
          </div>
          <div>
            <span>Đã xác nhận</span>
            <strong>{bookingStats.confirmed}</strong>
          </div>
          <div>
            <span>Đang dùng</span>
            <strong>{bookingStats.inUse}</strong>
          </div>
          <div>
            <span>Hoàn tất</span>
            <strong>{bookingStats.completed}</strong>
          </div>
        </div>
      </div>

      <div className="booking-layout">
        <section className="panel booking-form-panel">
          <div className="panel-title">
            <div>
              <h2>Tạo lịch đặt phòng họp</h2>
            </div>
          </div>

          <div className="booking-form-grid">
            <label>
              Phòng họp / tài sản
              <select
                value={form.assetCode}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, assetCode: event.target.value }));
                  setAvailability(null);
                }}
              >
                <option value="">Chọn mã phòng họp</option>
                {assetOptions.map((asset) => (
                  <option key={asset.id} value={asset.assetCode}>
                    {asset.assetCode} · {asset.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Tiêu đề
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Họp thiết kế, demo nội bộ..."
              />
            </label>

            <label>
              Bắt đầu
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, startTime: event.target.value }));
                  setAvailability(null);
                }}
              />
            </label>

            <label>
              Kết thúc
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, endTime: event.target.value }));
                  setAvailability(null);
                }}
              />
            </label>

            <label>
              Người phụ trách
              <input
                value={user?.username || "Tài khoản hiện tại"}
                readOnly
                disabled
                title="Hệ thống tự ghi nhận người đặt theo tài khoản đăng nhập"
              />
            </label>

            <label>
              Phòng ban
              <input
                inputMode="numeric"
                value={form.departmentId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, departmentId: event.target.value }))
                }
                placeholder="ID phòng ban"
              />
            </label>

            <label>
              Mục đích
              <textarea
                value={form.purpose}
                onChange={(event) => setForm((prev) => ({ ...prev, purpose: event.target.value }))}
                rows={3}
                placeholder="Nội dung, nhóm tham gia, yêu cầu chuẩn bị..."
              />
            </label>

            <label>
              Ghi chú
              <textarea
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                rows={3}
                placeholder="Thiết bị cần chuẩn bị, setup phòng..."
              />
            </label>
          </div>

          <div className="booking-option-row">
            <label className="booking-checkbox">
              <input
                type="checkbox"
                checked={form.autoRelease}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, autoRelease: event.target.checked }))
                }
              />
              Tự động trả phòng khi hết giờ
            </label>
            {availability && (
              <div
                className={`booking-availability ${availability.available ? "available" : "blocked"}`}
              >
                {availability.available ? <FiCheckCircle /> : <FiXCircle />}
                <span>{availability.available ? "Khung giờ khả dụng" : availability.reason}</span>
              </div>
            )}
          </div>

          <div className="booking-form-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => void handleCheckAvailability()}
              disabled={submitting}
            >
              <FiSearch /> Kiểm tra lịch
            </button>
            <button type="button" onClick={() => void handleCreateBooking()} disabled={submitting}>
              <FiCalendar /> Xác nhận đặt phòng
            </button>
            <button type="button" className="secondary" onClick={resetForm} disabled={submitting}>
              Làm trống
            </button>
          </div>
        </section>

        <section className="panel booking-flow-panel">
          <div className="panel-title">
            <div>
              <h2>Hướng dẫn đặt lịch</h2>
            </div>
          </div>
          <div className="booking-flow-list">
            <div>
              <FiSearch />
              <span>Kiểm tra phòng, thời gian và trùng lịch</span>
            </div>
            <div>
              <FiCheckCircle />
              <span>Tạo booking ở trạng thái đã xác nhận</span>
            </div>
            <div>
              <FiLogIn />
              <span>Check-in khi nhận phòng</span>
            </div>
            <div>
              <FiLogOut />
              <span>Check-out hoặc tự động trả phòng</span>
            </div>
          </div>
        </section>
      </div>

      <section className="panel booking-calendar-panel">
        <div className="booking-calendar-head">
          <div>
            <h2>Lịch phòng họp</h2>
          </div>
          <div className="booking-calendar-controls">
            <button type="button" className="secondary" onClick={() => moveCalendar(-1)}>
              <FiChevronLeft /> Trước
            </button>
            <button type="button" className="secondary" onClick={() => setCalendarDate(new Date())}>
              Hôm nay
            </button>
            <button type="button" className="secondary" onClick={() => moveCalendar(1)}>
              Sau <FiChevronRight />
            </button>
            <label className="booking-calendar-view-select">
              <span>Chế độ xem</span>
              <select
                value={calendarView}
                onChange={(event) => setCalendarView(event.target.value as BookingCalendarView)}
              >
                <option value="day">Ngày</option>
                <option value="week">Tuần</option>
                <option value="month">Tháng</option>
              </select>
            </label>
          </div>
        </div>
        <div className="booking-calendar-title">
          {formatCalendarTitle(calendarDate, calendarView)}
        </div>
        <div className="booking-calendar-shell">
          <aside className="booking-calendar-sidebar">
            <div className="booking-mini-calendar">
              <div className="booking-mini-calendar-head">
                <strong>
                  {calendarDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
                </strong>
              </div>
              <div className="booking-mini-weekdays">
                {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="booking-mini-days">
                {monthDays.map((day) => (
                  <button
                    key={day.toISOString()}
                    type="button"
                    data-muted={day.getMonth() !== calendarDate.getMonth()}
                    data-selected={isSameDay(day, calendarDate) || undefined}
                    data-today={isSameDay(day, new Date()) || undefined}
                    onClick={() => setCalendarDate(day)}
                  >
                    {day.getDate()}
                  </button>
                ))}
              </div>
            </div>
            <div className="booking-calendar-sidebar-filters">
              <label className="asset-filter-field">
                <span>Phòng họp</span>
                <select
                  value={filters.assetCode}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, assetCode: event.target.value }))
                  }
                >
                  <option value="">Tất cả phòng</option>
                  {assetOptions.map((asset) => (
                    <option key={asset.id} value={asset.assetCode}>
                      {asset.assetCode} · {asset.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="asset-filter-field">
                <span>Trạng thái</span>
                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, status: event.target.value }))
                  }
                >
                  {BOOKING_STATUS_OPTIONS.map((option) => (
                    <option key={option.value || "all"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </aside>
          <div className={`booking-calendar-grid booking-calendar-view-${calendarView}`}>
            {calendarView === "month" ? (
              <>
                <div className="booking-calendar-weekdays">
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
                <div className="booking-calendar-days">
                  {calendarDays.map((day) => {
                    const dayBookings = bookingsForDay(day);
                    return (
                      <div
                        key={day.toISOString()}
                        className="booking-calendar-day"
                        data-muted={day.getMonth() !== calendarDate.getMonth()}
                        data-selected={isSameDay(day, calendarDate) || undefined}
                        data-today={isSameDay(day, new Date()) || undefined}
                      >
                        <button
                          type="button"
                          className="booking-calendar-day-number"
                          onClick={() => {
                            setCalendarDate(day);
                            setCalendarView("day");
                          }}
                        >
                          {day.getDate()}
                        </button>
                        <div className="booking-calendar-events">
                          {dayBookings.slice(0, 2).map((booking) => (
                            <button
                              key={booking.id}
                              type="button"
                              className="booking-calendar-event"
                              data-status={booking.status}
                              onClick={() => setSelectedBooking(booking)}
                              title={`${bookingTimeRange(booking)} · ${booking.title}`}
                            >
                              <span>{bookingTimeRange(booking)}</span>
                              <strong>{booking.title}</strong>
                            </button>
                          ))}
                          {dayBookings.length > 2 && (
                            <button
                              type="button"
                              className="booking-calendar-more"
                              onClick={() => {
                                setCalendarDate(day);
                                setCalendarView("day");
                              }}
                            >
                              +{dayBookings.length - 2} lịch khác
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className={`booking-time-grid booking-time-grid-${calendarView}`}>
                <div className="booking-time-grid-head">
                  <div className="booking-time-corner" />
                  {calendarDays.map((day) => (
                    <button
                      key={day.toISOString()}
                      type="button"
                      className="booking-time-day-label"
                      data-selected={isSameDay(day, calendarDate) || undefined}
                      data-today={isSameDay(day, new Date()) || undefined}
                      onClick={() => setCalendarDate(day)}
                    >
                      <span>{formatWeekdayShort(day)}</span>
                      <strong>{day.getDate()}</strong>
                    </button>
                  ))}
                </div>
                <div className="booking-time-grid-scroll" ref={timeGridScrollRef}>
                  <div className="booking-time-axis">
                    {BOOKING_HOURS.map((hour) => (
                      <div key={hour} style={{ height: BOOKING_HOUR_HEIGHT }}>
                        <span>{formatHourLabel(hour)}</span>
                      </div>
                    ))}
                  </div>
                  <div
                    className="booking-time-columns"
                    style={{
                      gridTemplateColumns: `repeat(${calendarDays.length}, minmax(150px, 1fr))`,
                    }}
                  >
                    {calendarDays.map((day) => {
                      const dayBookings = bookingsForDay(day);
                      const timedLayouts = buildTimedBookingLayouts(dayBookings);
                      const isToday = isSameDay(day, new Date());
                      const now = new Date();
                      const currentTop = (minutesSinceDayStart(now) / 60) * BOOKING_HOUR_HEIGHT;
                      return (
                        <div
                          key={day.toISOString()}
                          className="booking-time-column"
                          data-selected={isSameDay(day, calendarDate) || undefined}
                          data-today={isToday || undefined}
                          onClick={() => setCalendarDate(day)}
                        >
                          {BOOKING_HOURS.map((hour) => (
                            <div
                              key={hour}
                              className="booking-time-slot"
                              style={{ height: BOOKING_HOUR_HEIGHT }}
                            />
                          ))}
                          {isToday && (
                            <div className="booking-current-time-line" style={{ top: currentTop }}>
                              <span />
                            </div>
                          )}
                          {timedLayouts.map((layout) => {
                            const columnWidth = 100 / layout.columnCount;
                            return (
                              <button
                                key={layout.booking.id}
                                type="button"
                                className="booking-time-event"
                                data-status={layout.booking.status}
                                style={{
                                  top: layout.top,
                                  height: layout.height,
                                  left: `calc(${layout.column * columnWidth}% + 3px)`,
                                  width: `calc(${columnWidth}% - 6px)`,
                                }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedBooking(layout.booking);
                                }}
                              >
                                <strong>{layout.booking.title}</strong>
                                <span>{bookingTimeRange(layout.booking)}</span>
                                <small>
                                  {layout.booking.assetName ||
                                    layout.booking.assetCode ||
                                    "Phòng họp"}
                                </small>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title booking-table-head">
          <div>
            <h2>Danh sách lịch đặt</h2>
          </div>
          <div className="booking-table-tools">
            <div className="booking-column-dropdown">
              <button
                type="button"
                className="asset-table-text-action asset-column-config-toggle booking-column-config-toggle"
                aria-haspopup="menu"
                aria-expanded={bookingColumnConfigOpen}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setBookingColumnConfigOpen((open) => !open)}
              >
                <FiSettings /> Cấu hình cột
              </button>
              {bookingColumnConfigOpen && (
                <div
                  className="asset-column-popover booking-column-popover"
                  role="menu"
                  aria-labelledby="booking-column-config-title"
                >
                  <div className="asset-column-popover-head">
                    <div>
                      <strong id="booking-column-config-title">Cấu hình cột</strong>
                      <span>Bật/tắt cột cần xem. Các cột bắt buộc được cố định trong bảng.</span>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setBookingColumnConfigOpen(false)}
                    >
                      <FiX />
                    </button>
                  </div>
                  <div className="asset-column-list">
                    {bookingColumnConfigOrder.map((id) => {
                      const column = BOOKING_TABLE_COLUMNS.find((item) => item.id === id);
                      if (!column) return null;
                      const locked = Boolean(column.locked);
                      const checked = visibleBookingColumnSet.has(id) || locked;
                      return (
                        <label
                          key={id}
                          className={`asset-column-option ${
                            draggedBookingColumn === id ? "is-dragging" : ""
                          } ${locked ? "is-locked" : ""}`}
                          draggable={!locked}
                          onDragStart={() => {
                            if (!locked) setDraggedBookingColumn(id);
                          }}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => dropBookingColumn(id)}
                          onDragEnd={() => setDraggedBookingColumn(null)}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={locked}
                            onChange={() => toggleBookingColumn(id)}
                          />
                          <span>{column.label}</span>
                          {locked && <em>Bắt buộc</em>}
                        </label>
                      );
                    })}
                  </div>
                  <div className="asset-column-popover-actions">
                    <button type="button" className="secondary" onClick={resetBookingColumns}>
                      <FiRotateCcw /> Mặc định
                    </button>
                    <button
                      type="button"
                      className="primary"
                      onClick={() => setBookingColumnConfigOpen(false)}
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              className="secondary"
              onClick={() => void loadBookings()}
              disabled={loading || submitting}
            >
              <FiRefreshCw /> Làm mới
            </button>
          </div>
        </div>

        <div className="booking-filters">
          <label>
            Phòng họp
            <select
              value={filters.assetCode}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, assetCode: event.target.value }))
              }
            >
              <option value="">Tất cả phòng</option>
              {assetOptions.map((asset) => (
                <option key={asset.id} value={asset.assetCode}>
                  {asset.assetCode} · {asset.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trạng thái
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              {BOOKING_STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Từ thời điểm
            <input
              type="datetime-local"
              value={filters.fromTime}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, fromTime: event.target.value }))
              }
            />
          </label>
          <label>
            Đến thời điểm
            <input
              type="datetime-local"
              value={filters.toTime}
              onChange={(event) => setFilters((prev) => ({ ...prev, toTime: event.target.value }))}
            />
          </label>
        </div>

        <div className="booking-table">
          <DataTable
            data={bookings}
            getRowKey={(item) => item.id}
            emptyText={loading ? "Đang tải lịch đặt phòng..." : "Chưa có lịch đặt phòng"}
            itemLabel="lịch đặt"
            tableMinWidth={bookingTableMinWidth}
            columns={configuredBookingColumns.map((column) => ({
              key: column.id,
              title: column.label,
              render: column.render,
              className: `booking-table-col-${column.id} ${
                ["booking", "asset"].includes(column.id)
                  ? `booking-table-sticky-left booking-table-sticky-${column.id}`
                  : column.id === "actions"
                    ? "booking-table-sticky-right booking-table-actions-col"
                    : ""
              }`,
            }))}
          />
        </div>
      </section>

      {selectedBooking && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setSelectedBooking(null)}
        >
          <div
            className="crud-modal booking-detail-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div className="modal-title-group">
                <span className="modal-title-icon edit">
                  <FiCalendar />
                </span>
                <div>
                  <h2>{selectedBooking.title}</h2>
                  <p>{selectedBooking.bookingCode}</p>
                </div>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedBooking(null)}
              >
                <FiXCircle />
              </button>
            </div>
            <div className="booking-detail-body">
              <div className="booking-detail-summary">
                <div>
                  <span>Phòng họp</span>
                  <strong>{selectedBooking.assetName || "--"}</strong>
                  <small>{selectedBooking.assetCode || `#${selectedBooking.assetId}`}</small>
                </div>
                <div>
                  <span>Trạng thái</span>
                  <BookingStatusBadge status={selectedBooking.status} />
                </div>
                <div>
                  <span>Tự động trả phòng</span>
                  <strong>{selectedBooking.autoRelease ? "Có" : "Không"}</strong>
                </div>
              </div>
              <div className="booking-detail-grid">
                <div>
                  <span>Bắt đầu</span>
                  <strong>{formatDateTime(selectedBooking.startTime)}</strong>
                </div>
                <div>
                  <span>Kết thúc</span>
                  <strong>{formatDateTime(selectedBooking.endTime)}</strong>
                </div>
                <div>
                  <span>Check-in</span>
                  <strong>{formatDateTime(selectedBooking.checkedInAt)}</strong>
                </div>
                <div>
                  <span>Check-out</span>
                  <strong>{formatDateTime(selectedBooking.checkedOutAt)}</strong>
                </div>
                <div>
                  <span>Người phụ trách</span>
                  <strong>{selectedBooking.requestedByEmployeeId || "--"}</strong>
                </div>
                <div>
                  <span>Phòng ban / site / dự án</span>
                  <strong>
                    {[
                      selectedBooking.departmentId,
                      selectedBooking.siteId,
                      selectedBooking.projectId,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "--"}
                  </strong>
                </div>
                <div className="booking-detail-wide">
                  <span>Mục đích</span>
                  <strong>{selectedBooking.purpose || "--"}</strong>
                </div>
                <div className="booking-detail-wide">
                  <span>Ghi chú</span>
                  <strong>{selectedBooking.notes || "--"}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setConfirmAction(null)}
        >
          <div
            className="crud-modal booking-confirm-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div className="modal-title-group">
                <span className="modal-title-icon create">
                  <FiClock />
                </span>
                <div>
                  <h2>Xác nhận {actionLabel(confirmAction.type)}</h2>
                  <p>{confirmAction.booking.title}</p>
                </div>
              </div>
            </div>
            <div className="booking-confirm-body">
              <p>
                Bạn chắc chắn muốn {actionLabel(confirmAction.type)} cho phiên{" "}
                <strong>{confirmAction.booking.bookingCode}</strong>?
              </p>
              {confirmAction.type === "cancel" && (
                <label>
                  Lý do hủy
                  <textarea
                    rows={3}
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    placeholder="Nhập lý do để lưu lịch sử hủy..."
                  />
                </label>
              )}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setConfirmAction(null);
                  setCancelReason("");
                }}
                disabled={submitting}
              >
                Đóng
              </button>
              <button
                type="button"
                className={confirmAction.type === "cancel" ? "danger-action" : "primary-action"}
                onClick={() => void handleConfirmAction()}
                disabled={submitting}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
