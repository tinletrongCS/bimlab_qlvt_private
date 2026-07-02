package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.AssetBookingCancelRequest;
import com.bimlab.asset.dto.request.AssetBookingCheckoutRequest;
import com.bimlab.asset.dto.request.AssetBookingRequest;
import com.bimlab.asset.mapper.AssetBookingMapper;
import com.bimlab.asset.model.AssetBookingSession;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.status.AssetBookingStatus;
import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.repository.AssetBookingSessionRepository;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.security.AssetAccessService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Booking module (production hardening 2026-07-02):
 * - create() stamps requester/createdBy from the JWT principal, never from the body (anti-impersonation);
 * - lifecycle endpoints (check-in/out/cancel/auto-release) were 500 stubs, now implemented with a
 *   per-record owner-or-admin guard and clean state-machine errors (409 via IllegalStateException).
 */
@ExtendWith(MockitoExtension.class)
class AssetBookingServiceTest {

    @Mock AssetBookingSessionRepository bookings;
    @Mock AssetItemRepository assets;
    @Mock AssetBookingMapper mapper;
    @Mock AssetAccessService access;

    @InjectMocks AssetBookingService service;

    private static AssetBookingRequest payload(Long requesterFromBody, String createdByFromBody) {
        return new AssetBookingRequest(
                "ROOM-A", "Họp tuần", "Sync team",
                LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(1).plusHours(1),
                requesterFromBody, 1L, 2L, 3L, true, "note", createdByFromBody);
    }

    private AssetItem bookableRoom() {
        return AssetItem.builder().assetCode("ROOM-A").status(AssetStatus.IN_STOCK).build();
    }

    private AssetBookingSession existing(AssetBookingStatus status, Long requestedBy) {
        return AssetBookingSession.builder()
                .id(7L).bookingCode("BK-1").title("t").status(status)
                .requestedByEmployeeId(requestedBy).autoRelease(true)
                .startTime(LocalDateTime.now()).endTime(LocalDateTime.now().plusHours(1))
                .build();
    }

    @Test
    void createBooking_stampsRequesterAndCreatedByFromCaller_ignoringBody() {
        when(assets.findByAssetCode("ROOM-A")).thenReturn(Optional.of(bookableRoom()));
        when(bookings.findOverlappingBookings(any(), any(), any(), any())).thenReturn(List.of());
        when(bookings.save(any(AssetBookingSession.class))).thenAnswer(inv -> inv.getArgument(0));

        service.createBooking(payload(99L, "attacker"), 42L, "alice");

        ArgumentCaptor<AssetBookingSession> captor = ArgumentCaptor.forClass(AssetBookingSession.class);
        verify(bookings).save(captor.capture());
        assertEquals(42L, captor.getValue().getRequestedByEmployeeId(), "requester must come from caller, not body");
        assertEquals("alice", captor.getValue().getCreatedBy(), "createdBy must come from principal, not body");
    }

    @Test
    void createBooking_rejectsUnlinkedAccount() {
        assertThrows(AccessDeniedException.class,
                () -> service.createBooking(payload(99L, "x"), null, "alice"));
        verify(bookings, never()).save(any());
    }

    @Test
    void checkIn_confirmedToInUse_withOwnerGuard() {
        when(bookings.findById(7L)).thenReturn(Optional.of(existing(AssetBookingStatus.CONFIRMED, 42L)));
        when(bookings.save(any(AssetBookingSession.class))).thenAnswer(inv -> inv.getArgument(0));

        service.checkIn(7L, 42L, "alice");

        verify(access).ensureSelfOrAny(eq(42L), anySet());
        ArgumentCaptor<AssetBookingSession> captor = ArgumentCaptor.forClass(AssetBookingSession.class);
        verify(bookings).save(captor.capture());
        assertEquals(AssetBookingStatus.IN_USE, captor.getValue().getStatus());
        assertEquals("alice", captor.getValue().getUpdatedBy());
    }

    @Test
    void checkIn_rejectsNonConfirmed() {
        when(bookings.findById(7L)).thenReturn(Optional.of(existing(AssetBookingStatus.COMPLETED, 42L)));
        assertThrows(IllegalStateException.class, () -> service.checkIn(7L, 42L, "alice"));
        verify(bookings, never()).save(any());
    }

    @Test
    void checkIn_deniedWhenGuardRejects() {
        when(bookings.findById(7L)).thenReturn(Optional.of(existing(AssetBookingStatus.CONFIRMED, 99L)));
        doThrow(new AccessDeniedException("nope")).when(access).ensureSelfOrAny(any(), anySet());
        assertThrows(AccessDeniedException.class, () -> service.checkIn(7L, 42L, "alice"));
        verify(bookings, never()).save(any());
    }

    @Test
    void cancel_stampsCancelledByFromPrincipal_ignoringBody() {
        when(bookings.findById(7L)).thenReturn(Optional.of(existing(AssetBookingStatus.CONFIRMED, 42L)));
        when(bookings.save(any(AssetBookingSession.class))).thenAnswer(inv -> inv.getArgument(0));

        service.cancel(7L, new AssetBookingCancelRequest("attacker", "lý do thật"), 42L, "alice");

        ArgumentCaptor<AssetBookingSession> captor = ArgumentCaptor.forClass(AssetBookingSession.class);
        verify(bookings).save(captor.capture());
        assertEquals(AssetBookingStatus.CANCELLED, captor.getValue().getStatus());
        assertEquals("alice", captor.getValue().getCancelledBy(), "cancelledBy must come from principal, not body");
        assertEquals("lý do thật", captor.getValue().getCancelReason());
    }

    @Test
    void cancel_rejectsAlreadyCompleted() {
        when(bookings.findById(7L)).thenReturn(Optional.of(existing(AssetBookingStatus.COMPLETED, 42L)));
        assertThrows(IllegalStateException.class,
                () -> service.cancel(7L, new AssetBookingCancelRequest("x", "y"), 42L, "alice"));
        verify(bookings, never()).save(any());
    }

    @Test
    void checkOut_completesFromInUse() {
        when(bookings.findById(7L)).thenReturn(Optional.of(existing(AssetBookingStatus.IN_USE, 42L)));
        when(bookings.save(any(AssetBookingSession.class))).thenAnswer(inv -> inv.getArgument(0));

        service.checkOut(7L, new AssetBookingCheckoutRequest("attacker", "done"), 42L, "alice");

        ArgumentCaptor<AssetBookingSession> captor = ArgumentCaptor.forClass(AssetBookingSession.class);
        verify(bookings).save(captor.capture());
        assertEquals(AssetBookingStatus.COMPLETED, captor.getValue().getStatus());
        assertEquals("alice", captor.getValue().getUpdatedBy());
    }

    @Test
    void autoReleaseDue_completesDueSessionsAsSystem() {
        AssetBookingSession due = existing(AssetBookingStatus.IN_USE, 42L);
        when(bookings.findAutoReleaseDue(eq(AssetBookingStatus.IN_USE), any()))
                .thenReturn(List.of(due));
        when(bookings.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        service.autoReleaseDue(null);

        assertEquals(AssetBookingStatus.COMPLETED, due.getStatus());
        assertEquals("system", due.getUpdatedBy());
    }
}
