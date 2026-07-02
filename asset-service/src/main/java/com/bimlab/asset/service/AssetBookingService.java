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
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.security.Permission;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
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
    private final AssetAccessService access;

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
    public AssetBookingResponse createBooking(AssetBookingRequest req, Long callerEmployeeId, String callerUsername) {
        // Danh tính người đặt PHẢI lấy từ principal (JWT), không tin req.requestedByEmployeeId/createdBy
        // để tránh mạo danh + hỏng audit trail. Tài khoản chưa liên kết nhân viên thì không được đặt.
        if (callerEmployeeId == null) {
            throw new AccessDeniedException("Tài khoản chưa liên kết nhân viên nên không thể đặt phòng");
        }
        AssetItem assetItem = findBookableAsset(req.assetCode());
        // Khoá bi quan hàng asset: serialize các lượt tạo booking đồng thời cùng phòng (chống đặt trùng do race).
        assets.findByAssetCodeForUpdate(assetItem.getAssetCode());
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
                .requestedByEmployeeId(callerEmployeeId)
                .departmentId(req.departmentId())
                .siteId(req.siteId())
                .projectId(req.projectId())
                .status(AssetBookingStatus.CONFIRMED)
                .autoRelease(req.autoRelease() == null ? Boolean.TRUE : req.autoRelease())
                .notes(req.notes())
                .createdBy(callerUsername)
                .build();

        return mapper.toResponse(bookings.save(booking));
    }

    @Transactional
    public AssetBookingResponse checkIn(Long id, Long callerEmployeeId, String callerUsername) {
        AssetBookingSession booking = findBookingOrThrow(id);
        // Chỉ người đặt phòng (hoặc admin QLVT) mới được thao tác vòng đời phiên đặt.
        access.ensureSelfOrAny(booking.getRequestedByEmployeeId(), Permission.Sets.ASSET_ADMIN);
        if (booking.getStatus() != AssetBookingStatus.CONFIRMED) {
            throw new IllegalStateException("Chỉ nhận phòng khi phiên đặt đang ở trạng thái CONFIRMED");
        }
        booking.setStatus(AssetBookingStatus.IN_USE);
        booking.setCheckedInAt(LocalDateTime.now());
        booking.setUpdatedBy(callerUsername);
        return mapper.toResponse(bookings.save(booking));
    }

    @Transactional
    public AssetBookingResponse checkOut(Long id, AssetBookingCheckoutRequest req, Long callerEmployeeId, String callerUsername) {
        AssetBookingSession booking = findBookingOrThrow(id);
        access.ensureSelfOrAny(booking.getRequestedByEmployeeId(), Permission.Sets.ASSET_ADMIN);
        if (booking.getStatus() != AssetBookingStatus.IN_USE && booking.getStatus() != AssetBookingStatus.CONFIRMED) {
            throw new IllegalStateException("Chỉ trả phòng khi phiên đặt đang IN_USE hoặc CONFIRMED");
        }
        booking.setStatus(AssetBookingStatus.COMPLETED);
        booking.setCheckedOutAt(LocalDateTime.now());
        // updatedBy đóng dấu từ principal — KHÔNG tin req.completedBy() (audit chống mạo danh).
        booking.setUpdatedBy(callerUsername);
        if (req != null && req.notes() != null && !req.notes().isBlank()) {
            booking.setNotes(req.notes());
        }
        return mapper.toResponse(bookings.save(booking));
    }

    @Transactional
    public AssetBookingResponse cancel(Long id, AssetBookingCancelRequest req, Long callerEmployeeId, String callerUsername) {
        AssetBookingSession booking = findBookingOrThrow(id);
        access.ensureSelfOrAny(booking.getRequestedByEmployeeId(), Permission.Sets.ASSET_ADMIN);
        if (booking.getStatus() == AssetBookingStatus.COMPLETED || booking.getStatus() == AssetBookingStatus.CANCELLED) {
            throw new IllegalStateException("Không thể hủy phiên đặt đã hoàn tất hoặc đã hủy");
        }
        booking.setStatus(AssetBookingStatus.CANCELLED);
        // cancelledBy đóng dấu từ principal — KHÔNG tin req.cancelledBy(). cancelReason là dữ liệu người dùng hợp lệ.
        booking.setCancelledBy(callerUsername);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancelReason(req.cancelReason());
        booking.setUpdatedBy(callerUsername);
        return mapper.toResponse(bookings.save(booking));
    }

    @Transactional
    public List<AssetBookingResponse> autoReleaseDue(LocalDateTime now) {
        LocalDateTime at = (now == null) ? LocalDateTime.now() : now;
        List<AssetBookingSession> due = bookings.findAutoReleaseDue(AssetBookingStatus.IN_USE, at);
        for (AssetBookingSession booking : due) {
            booking.setStatus(AssetBookingStatus.COMPLETED);
            booking.setCheckedOutAt(at);
            booking.setUpdatedBy("system");
        }
        return bookings.saveAll(due).stream().map(mapper::toResponse).toList();
    }

    private AssetBookingSession findBookingOrThrow(Long id) {
        return bookings.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy phiên đặt phòng"));
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

