package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.AssetBookingCancelRequest;
import com.bimlab.asset.dto.request.AssetBookingCheckoutRequest;
import com.bimlab.asset.dto.request.AssetBookingRequest;
import com.bimlab.asset.dto.response.AssetBookingAvailabilityResponse;
import com.bimlab.asset.dto.response.AssetBookingResponse;
import com.bimlab.asset.mapper.AssetBookingMapper;
import com.bimlab.asset.model.AssetBookingSession;
import com.bimlab.asset.model.status.AssetBookingStatus;
import com.bimlab.asset.repository.AssetBookingSessionRepository;
import com.bimlab.asset.repository.AssetItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AssetBookingService {
    private static final List<AssetBookingStatus> BLOCKING_STATUSES = List.of(
            AssetBookingStatus.CONFIRMED,
            AssetBookingStatus.IN_USE
    );

    private final AssetBookingSessionRepository bookings;
    private final AssetItemRepository assets;
    private final AssetBookingMapper mapper;

    @Transactional(readOnly = true)
    public List<AssetBookingResponse> listBookings(Long assetId, String status, LocalDateTime fromTime, LocalDateTime toTime) {
        // TODO PRACTICE 1:
        // Liệt kê phiên booking theo bộ lọc.
        //
        // Yêu cầu:
        // - Nếu status != null thì parse sang AssetBookingStatus.
        // - Dùng bookings.searchBookings(assetId, parsedStatus, fromTime, toTime).
        // - Map từng AssetBookingSession sang AssetBookingResponse bằng mapper.toResponse(...).
        // - Nếu status sai enum thì throw IllegalArgumentException với message dễ hiểu.
        AssetBookingSession bookingSession = new AssetBookingSession();
        throw new UnsupportedOperationException("TODO: list booking sessions");
    }

    @Transactional(readOnly = true)
    public AssetBookingResponse getBooking(Long id) {
        // TODO PRACTICE 2:
        // Tìm booking theo id.
        //
        // Gợi ý:
        // - bookings.findById(id).orElseThrow(...)
        // - return mapper.toResponse(booking)
        throw new UnsupportedOperationException("TODO: get booking session");
    }

    @Transactional(readOnly = true)
    public AssetBookingAvailabilityResponse checkAvailability(Long assetId, LocalDateTime startTime, LocalDateTime endTime) {
        // TODO PRACTICE 3:
        // Kiểm tra điều kiện trước khi hiển thị màn hình xác nhận đặt phòng.
        //
        // Yêu cầu nghiệp vụ:
        // - Kiểm tra assetId tồn tại bằng assets.existsById(assetId).
        // - Kiểm tra startTime/endTime không null và endTime > startTime.
        // - Có thể chặn đặt lịch trong quá khứ nếu muốn.
        // - Dùng bookings.findOverlappingBookings(assetId, startTime, endTime, BLOCKING_STATUSES).
        // - Nếu có booking trùng giờ thì trả available = false kèm id/code booking bị trùng.
        // - Nếu hợp lệ thì trả available = true.
        //
        // Lưu ý:
        // - DB đã có exclusion constraint ở V5 để chống race condition.
        // - Service vẫn nên check trước để trả lỗi thân thiện cho UI.
        throw new UnsupportedOperationException("TODO: check booking availability");
    }

    @Transactional
    public AssetBookingResponse createBooking(AssetBookingRequest req) {
        // TODO PRACTICE 4:
        // Tạo phiên booking phòng họp sau khi người dùng bấm xác nhận.
        //
        // Flow theo sơ đồ:
        // 1. Tìm AssetItem theo req.assetId(), nếu không có thì throw NoSuchElementException.
        // 2. Validate thời gian: endTime phải lớn hơn startTime.
        // 3. Kiểm tra trùng lịch bằng findOverlappingBookings(..., BLOCKING_STATUSES).
        // 4. Sinh bookingCode, ví dụ BK-yyyyMMdd-HHmmss-{assetId}; sau này có thể đổi sang sequence.
        // 5. Tạo AssetBookingSession với status CONFIRMED.
        // 6. Set title, purpose, requestedByEmployeeId, departmentId, siteId, projectId, autoRelease, notes, createdBy.
        // 7. Save bằng bookings.save(...).
        // 8. Return mapper.toResponse(saved).
        //
        // Gợi ý thêm:
        // - Nếu asset không phải phòng họp/bookable asset thì nên chặn ở đây.
        // - Khi DB ném lỗi exclusion constraint do race condition, bắt ở layer handler hoặc để Spring trả lỗi 409 sau này.
        throw new UnsupportedOperationException("TODO: create booking session");
    }

    @Transactional
    public AssetBookingResponse checkIn(Long id) {
        // TODO PRACTICE 5:
        // Chuyển booking từ CONFIRMED sang IN_USE khi đến giờ/nhận phòng.
        //
        // Yêu cầu:
        // - Tìm booking theo id.
        // - Chỉ cho check-in nếu status hiện tại là CONFIRMED.
        // - Có thể kiểm tra thời gian hiện tại nằm gần startTime/endTime.
        // - Set status = IN_USE, checkedInAt = LocalDateTime.now().
        // - Save và return response.
        throw new UnsupportedOperationException("TODO: check in booking session");
    }

    @Transactional
    public AssetBookingResponse checkOut(Long id, AssetBookingCheckoutRequest req) {
        // TODO PRACTICE 6:
        // Hoàn tất phiên booking và trả phòng thủ công.
        //
        // Yêu cầu:
        // - Tìm booking theo id.
        // - Chỉ cho checkout nếu status là IN_USE hoặc CONFIRMED tùy rule bạn chọn.
        // - Set status = COMPLETED, checkedOutAt = LocalDateTime.now().
        // - Nếu req.completedBy() có dữ liệu thì có thể lưu vào updatedBy.
        // - Nếu req.notes() có dữ liệu thì append/cập nhật notes.
        // - Save và return response.
        throw new UnsupportedOperationException("TODO: check out booking session");
    }

    @Transactional
    public AssetBookingResponse cancel(Long id, AssetBookingCancelRequest req) {
        // TODO PRACTICE 7:
        // Hủy booking khi người dùng không xác nhận hoặc chủ động hủy lịch.
        //
        // Yêu cầu:
        // - Tìm booking theo id.
        // - Không cho hủy nếu status đã COMPLETED/CANCELLED.
        // - Set status = CANCELLED, cancelledBy, cancelledAt, cancelReason.
        // - Save và return response.
        throw new UnsupportedOperationException("TODO: cancel booking session");
    }

    @Transactional
    public List<AssetBookingResponse> autoReleaseDue(LocalDateTime now) {
        // TODO PRACTICE 8:
        // Tự động trả phòng cho các phiên đã quá endTime và autoRelease = true.
        //
        // Yêu cầu:
        // - Nếu now == null thì dùng LocalDateTime.now().
        // - Dùng bookings.findAutoReleaseDue(AssetBookingStatus.IN_USE, now).
        // - Với từng booking: set status = COMPLETED, checkedOutAt = now, updatedBy = "system".
        // - Save tất cả rồi map sang response.
        //
        // Gợi ý:
        // - Sau này method này nên được gọi bởi @Scheduled thay vì endpoint thủ công.
        // - Nếu autoRelease = false, flow sẽ chờ người phụ trách xác nhận trả phòng.
        throw new UnsupportedOperationException("TODO: auto release due booking sessions");
    }
}
