package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.AssetBookingCancelRequest;
import com.bimlab.asset.dto.request.AssetBookingCheckoutRequest;
import com.bimlab.asset.dto.request.AssetBookingRequest;
import com.bimlab.asset.dto.response.AssetBookingAvailabilityResponse;
import com.bimlab.asset.dto.response.AssetBookingResponse;
import com.bimlab.asset.mapper.AssetBookingMapper;
import com.bimlab.asset.model.AssetBookingSession;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.status.AssetBookingStatus;
import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.repository.AssetBookingSessionRepository;
import com.bimlab.asset.repository.AssetItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class AssetBookingService {
    private static final List<AssetBookingStatus> BLOCKING_STATUSES = List.of(
            AssetBookingStatus.CONFIRMED,   // sau khi đã đặt phòng thành công nhưng chưa đến giờ
            AssetBookingStatus.IN_USE       // hiện đang được sử dụng
    );

    private static final List<AssetStatus> UNAVAILABLE_STATUSES = List.of(
            AssetStatus.LOST,
            AssetStatus.MAINTENANCE,
            AssetStatus.DISPOSED
    );

    private static final DateTimeFormatter BOOKING_CODE_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final AssetBookingSessionRepository bookings;
    private final AssetItemRepository assets;
    private final AssetBookingMapper mapper;

    @Transactional(readOnly = true)
    public List<AssetBookingResponse> listBookings(Long assetId, String status, LocalDateTime fromTime, LocalDateTime toTime) {
        AssetBookingStatus parsedStatus = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                parsedStatus = AssetBookingStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
            } catch (Exception e) {
                throw new IllegalArgumentException("Trạng thái booking không hợp lệ: " + status);
            }
        }

        AssetBookingStatus finalParsedStatus = parsedStatus;
        Specification<AssetBookingSession> specification = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (assetId != null) {
                predicates.add(cb.equal(root.get("asset").get("id"), assetId));
            }
            if (finalParsedStatus != null) {
                predicates.add(cb.equal(root.get("status"), finalParsedStatus));
            }
            if (fromTime != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("endTime"), fromTime));
            }
            if (toTime != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("startTime"), toTime));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };

        List<AssetBookingSession> response = bookings.findAll(
                specification,
                Sort.by(Sort.Direction.DESC, "startTime")
        );
        return response.stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AssetBookingResponse getBooking(Long id) {
        AssetBookingSession bookingSession = bookings.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy phiên đặt phòng với mã " + id));
        return mapper.toResponse(bookingSession);
    }

    @Transactional(readOnly = true)
    public AssetBookingAvailabilityResponse checkAvailability(String assetCode, LocalDateTime startTime, LocalDateTime endTime) {
        AssetItem assetItem = findBookableAsset(assetCode);
        validateBookingTime(startTime, endTime);

        if (UNAVAILABLE_STATUSES.contains(assetItem.getStatus())) {
            return new AssetBookingAvailabilityResponse(
                    assetItem.getId(),
                    assetItem.getAssetCode(),
                    startTime,
                    endTime,
                    false,
                    "Phòng họp hiện không khả dụng do trạng thái " + assetItem.getStatus(),
                    null,
                    null
            );
        }

        AssetBookingSession conflict = findFirstConflict(assetItem.getAssetCode(), startTime, endTime);
        if (conflict != null) {
            return new AssetBookingAvailabilityResponse(
                    assetItem.getId(),
                    assetItem.getAssetCode(),
                    startTime,
                    endTime,
                    false,
                    "Phòng họp đã có lịch đặt trùng thời gian",
                    conflict.getId(),
                    conflict.getBookingCode()
            );
        }

        return new AssetBookingAvailabilityResponse(
                assetItem.getId(),
                assetItem.getAssetCode(),
                startTime,
                endTime,
                true,
                null,
                null,
                null
        );
    }

    @Transactional
    public AssetBookingResponse createBooking(AssetBookingRequest req) {
        AssetItem assetItem = findBookableAsset(req.assetCode());
        validateBookingTime(req.startTime(), req.endTime());
        List<AssetBookingSession> conflicts = bookings.findOverlappingBookings(
                assetItem.getAssetCode(),
                req.startTime(),
                req.endTime(),
                BLOCKING_STATUSES
        );

        if (conflicts.size() > 0) {
            throw new IllegalArgumentException("Phòng họp đã có lịch đặt trùng thời gian");
        }
        AssetBookingSession booking = AssetBookingSession.builder()
                .asset(assetItem)
                .bookingCode(generateBookingCode(assetItem))
                .title(req.title())
                .purpose(req.purpose())
                .startTime(req.startTime())
                .endTime(req.endTime())
                .requestedByEmployeeId(req.requestedByEmployeeId())
                .departmentId(req.departmentId())
                .siteId(req.siteId())
                .projectId(req.projectId())
                .status(AssetBookingStatus.CONFIRMED)
                .autoRelease(req.autoRelease() == null ? Boolean.TRUE : req.autoRelease())
                .notes(req.notes())
                .createdBy(req.createdBy())
                .build();

        return mapper.toResponse(bookings.save(booking));
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

    private AssetItem findBookableAsset(String assetCode) {
        if (assetCode == null || assetCode.trim().isEmpty()) {
            throw new IllegalArgumentException("Thiếu mã phòng họp");
        }

        String normalizedAssetCode = assetCode.trim();

        AssetItem asset = assets.findByAssetCode(normalizedAssetCode)
                .orElseThrow(() -> new NoSuchElementException(
                        "Không tìm thấy phòng họp với mã " + normalizedAssetCode
                ));


        if (UNAVAILABLE_STATUSES.contains(asset.getStatus())) {
            throw new IllegalArgumentException(
                    "Phòng họp hiện không khả dụng do trạng thái " + asset.getStatus()
            );
        }

        return asset;
    }

    private void validateBookingTime(LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime == null || endTime == null) {
            throw new IllegalArgumentException("Thiếu thời gian bắt đầu hoặc kết thúc");
        }

        if (!endTime.isAfter(startTime)) {
            throw new IllegalArgumentException("Thời gian kết thúc phải sau thời gian bắt đầu");
        }

        if (startTime.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Không thể đặt lịch trong quá khứ");
        }
    }

    private AssetBookingSession findFirstConflict(
            String assetCode,
            LocalDateTime startTime,
            LocalDateTime endTime
    ) {
        return bookings.findOverlappingBookings(
                assetCode,
                startTime,
                endTime,
                BLOCKING_STATUSES
        ).stream().findFirst().orElse(null);
    }

    private String generateBookingCode(AssetItem asset) {
        return "MEETING-ROOM-" + LocalDateTime.now().format(BOOKING_CODE_FORMAT) + "-" + asset.getAssetCode();
    }
}

