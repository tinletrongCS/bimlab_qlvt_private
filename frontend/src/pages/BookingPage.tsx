import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiLogIn,
  FiLogOut,
  FiRefreshCw,
  FiSearch,
  FiXCircle,
} from "react-icons/fi";
import { DataTable } from "../components/DataTable";
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

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

  return (
    <section className="booking-page page-grid">
      <div className="booking-hero panel">
        <div>
          {/* <p className="eyebrow">BOOKING</p> */}
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
                inputMode="numeric"
                value={form.requestedByEmployeeId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, requestedByEmployeeId: event.target.value }))
                }
                placeholder="ID nhân viên"
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
              <h2>Luồng xử lý</h2>
              <p>Các nút thao tác đã đặt sẵn để nối tiếp service backend sau này.</p>
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

      <section className="panel">
        <div className="panel-title booking-table-head">
          <div>
            <h2>Danh sách lịch đặt</h2>
            <p>Theo dõi phiên booking và thao tác nhận/trả/hủy phòng.</p>
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
            columns={[
              {
                key: "booking",
                title: "Phiên booking",
                render: (item) => (
                  <div className="asset-name-cell">
                    <strong>{item.title}</strong>
                    <span>{item.bookingCode}</span>
                  </div>
                ),
              },
              {
                key: "asset",
                title: "Phòng họp",
                render: (item) => (
                  <div className="asset-muted-stack">
                    <strong>{item.assetName || "—"}</strong>
                    <span>{item.assetCode || `#${item.assetId}`}</span>
                  </div>
                ),
              },
              {
                key: "time",
                title: "Khung giờ",
                render: (item) => (
                  <div className="asset-muted-stack">
                    <strong>{formatDateTime(item.startTime)}</strong>
                    <span>{formatDateTime(item.endTime)}</span>
                  </div>
                ),
              },
              {
                key: "owner",
                title: "Phụ trách",
                render: (item) => item.requestedByEmployeeId || item.createdBy || "—",
              },
              {
                key: "status",
                title: "Trạng thái",
                render: (item) => <BookingStatusBadge status={item.status} />,
              },
              {
                key: "actions",
                title: "",
                render: (item) => (
                  <div className="asset-row-icon-actions">
                    <button
                      type="button"
                      className="asset-icon-action"
                      title="Xem chi tiết"
                      onClick={() => setSelectedBooking(item)}
                    >
                      <FiEye />
                    </button>
                    <button
                      type="button"
                      className="asset-icon-action"
                      title="Check-in"
                      disabled={!canCheckIn(item)}
                      onClick={() => setConfirmAction({ type: "check-in", booking: item })}
                    >
                      <FiLogIn />
                    </button>
                    <button
                      type="button"
                      className="asset-icon-action"
                      title="Check-out"
                      disabled={!canCheckOut(item)}
                      onClick={() => setConfirmAction({ type: "check-out", booking: item })}
                    >
                      <FiLogOut />
                    </button>
                    <button
                      type="button"
                      className="asset-icon-action danger"
                      title="Hủy lịch"
                      disabled={!canCancel(item)}
                      onClick={() => setConfirmAction({ type: "cancel", booking: item })}
                    >
                      <FiXCircle />
                    </button>
                  </div>
                ),
              },
            ]}
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
                  <strong>{selectedBooking.assetName || "—"}</strong>
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
                  <strong>{selectedBooking.requestedByEmployeeId || "—"}</strong>
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
                      .join(" · ") || "—"}
                  </strong>
                </div>
                <div className="booking-detail-wide">
                  <span>Mục đích</span>
                  <strong>{selectedBooking.purpose || "—"}</strong>
                </div>
                <div className="booking-detail-wide">
                  <span>Ghi chú</span>
                  <strong>{selectedBooking.notes || "—"}</strong>
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
