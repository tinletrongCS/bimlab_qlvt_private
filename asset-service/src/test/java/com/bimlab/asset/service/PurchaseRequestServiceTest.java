package com.bimlab.asset.service;


import com.bimlab.asset.model.status.PurchaseRequestStatus;
import com.bimlab.asset.dto.request.PurchaseRequestRequest;
import com.bimlab.asset.model.PurchaseRequest;
import com.bimlab.asset.repository.PurchaseRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * F4 (preserved through Q2): server-side stamping of requesterEmployeeId +
 * status forcing on PurchaseRequest create/update. Previously the approver
 * could rewrite the audit trail by passing requesterEmployeeId in the body,
 * and any employee could submit a PR pre-approved by passing status=APPROVED.
 */
@ExtendWith(MockitoExtension.class)
class PurchaseRequestServiceTest {

    @Mock PurchaseRequestRepository purchaseRequests;

    @InjectMocks PurchaseRequestService service;

    private static PurchaseRequestRequest payload(Long requesterFromBody, String status) {
        return new PurchaseRequestRequest(
                "PURCHASE", "Mua laptop", "Bổ sung thiết bị",
                new BigDecimal("15000000"),
                requesterFromBody, 1L, 2L, 3L,
                LocalDate.of(2026, 6, 1),
                status, "Ghi chú"
        );
    }

    @Test
    void createPurchaseRequest_stampsRequesterFromCaller_ignoringBodyValue() {
        when(purchaseRequests.save(any(PurchaseRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        service.createPurchaseRequest(payload(99L, "APPROVED"), 42L);

        ArgumentCaptor<PurchaseRequest> captor = ArgumentCaptor.forClass(PurchaseRequest.class);
        verify(purchaseRequests).save(captor.capture());
        assertEquals(42L, captor.getValue().getRequesterEmployeeId(),
                "must stamp from caller, not from body");
    }

    @Test
    void createPurchaseRequest_forcesPendingStatus_ignoringBodyValue() {
        when(purchaseRequests.save(any(PurchaseRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        service.createPurchaseRequest(payload(null, "APPROVED"), 42L);

        ArgumentCaptor<PurchaseRequest> captor = ArgumentCaptor.forClass(PurchaseRequest.class);
        verify(purchaseRequests).save(captor.capture());
        assertEquals(PurchaseRequestStatus.PENDING, captor.getValue().getStatus(),
                "create path must force PENDING regardless of body");
    }

    @Test
    void createPurchaseRequest_acceptsNullCaller_butStampsNull() {
        // Edge case: caller resolution returns null (legacy/missing JWT
        // employeeId claim). Service still produces a PR with PENDING status
        // and null requester — the audit hole is closed at the controller
        // by access.getCurrentEmployeeId() but the service must not crash.
        when(purchaseRequests.save(any(PurchaseRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        service.createPurchaseRequest(payload(99L, null), null);

        ArgumentCaptor<PurchaseRequest> captor = ArgumentCaptor.forClass(PurchaseRequest.class);
        verify(purchaseRequests).save(captor.capture());
        assertNull(captor.getValue().getRequesterEmployeeId());
        assertEquals(PurchaseRequestStatus.PENDING, captor.getValue().getStatus());
    }

    @Test
    void updatePurchaseRequest_keepsStoredRequester_evenIfBodyDiffers() {
        // Stored PR was created by employee 7; approver tries to rewrite to 99.
        PurchaseRequest stored = new PurchaseRequest();
        stored.setId(100L);
        stored.setRequesterEmployeeId(7L);
        stored.setStatus(PurchaseRequestStatus.PENDING);
        when(purchaseRequests.findById(100L)).thenReturn(Optional.of(stored));
        when(purchaseRequests.save(any(PurchaseRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        service.updatePurchaseRequest(100L, payload(99L, "APPROVED"));

        ArgumentCaptor<PurchaseRequest> captor = ArgumentCaptor.forClass(PurchaseRequest.class);
        verify(purchaseRequests).save(captor.capture());
        assertEquals(7L, captor.getValue().getRequesterEmployeeId(),
                "update path must keep stored requesterEmployeeId");
        assertEquals(PurchaseRequestStatus.APPROVED, captor.getValue().getStatus());
    }
}
