package com.bimlab.asset.service;

import com.bimlab.asset.dto.PurchaseRequestPayload;
import com.bimlab.asset.model.PurchaseRequest;
import com.bimlab.asset.model.status.PurchaseRequestStatus;
import com.bimlab.asset.model.status.StatusParser;
import com.bimlab.asset.repository.PurchaseRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

/**
 * Q2: PurchaseRequest domain split from the original
 * {@code AssetManagementService}. Owns PR CRUD + status transitions.
 * {@link #getPurchaseRequest(Long)} is public — consumed by
 * {@link ContractService} when wiring a Contract to its source PR.
 *
 * <p>F4 security invariant preserved: server stamps
 * {@code requesterEmployeeId} from JWT principal on create and forces
 * {@code status=PENDING}. Approver-supplied payload cannot impersonate
 * the requester or pre-approve a PR.
 */
@Service
@RequiredArgsConstructor
public class PurchaseRequestService {
    private final PurchaseRequestRepository purchaseRequests;

    @Transactional(readOnly = true)
    public List<PurchaseRequest> listPurchaseRequests() {
        return purchaseRequests.findAll();
    }


    @Transactional(readOnly = true)
    public Page<PurchaseRequest> listPurchaseRequestsPaged(Pageable pageable) {
        return purchaseRequests.findAll(pageable);
    }
    @Transactional(readOnly = true)
    public PurchaseRequest getPurchaseRequest(Long id) {
        return purchaseRequests.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Đề nghị mua sắm không tồn tại"));
    }

    /**
     * F4: server stamps requesterEmployeeId from the JWT principal and forces
     * status=PENDING on create — previously the approver-supplied payload could
     * impersonate any requesterEmployeeId, corrupting the audit trail, and a
     * regular user could submit a PR pre-approved by passing status=APPROVED.
     */
    @Transactional
    public PurchaseRequest createPurchaseRequest(PurchaseRequestPayload req, Long callerEmployeeId) {
        PurchaseRequest pr = new PurchaseRequest();
        applyPurchaseRequest(pr, req, false);
        pr.setRequesterEmployeeId(callerEmployeeId);
        pr.setStatus(PurchaseRequestStatus.PENDING);
        return purchaseRequests.save(pr);
    }

    @Transactional
    public PurchaseRequest updatePurchaseRequest(Long id, PurchaseRequestPayload req) {
        PurchaseRequest pr = getPurchaseRequest(id);
        applyPurchaseRequest(pr, req, true);
        return purchaseRequests.save(pr);
    }

    @Transactional
    public PurchaseRequest updatePurchaseStatus(Long id, String status) {
        PurchaseRequest pr = getPurchaseRequest(id);
        pr.setStatus(StatusParser.parse(PurchaseRequestStatus.class, status));
        return purchaseRequests.save(pr);
    }

    @Transactional
    public void deletePurchaseRequest(Long id) {
        purchaseRequests.delete(getPurchaseRequest(id));
    }

    private void applyPurchaseRequest(PurchaseRequest pr, PurchaseRequestPayload req, boolean isUpdate) {
        pr.setRequestType(req.requestType());
        pr.setTitle(req.title());
        pr.setReason(req.reason());
        pr.setEstimatedCost(req.estimatedCost());
        // F4: NEVER apply caller-supplied requesterEmployeeId. On create the
        // service stamps it from JWT principal; on update we keep the stored
        // value so an approver cannot rewrite who requested.
        pr.setDepartmentId(req.departmentId());
        pr.setSiteId(req.siteId());
        pr.setProjectId(req.projectId());
        pr.setNeededDate(req.neededDate());
        // F4: on create, status is forced to PENDING by the caller AFTER this
        // method returns; the body value is ignored. On update, the body value
        // is permitted because PUT /{id} is gated by purchase_request_approve
        // (see PurchaseRequestController) — only approvers can hit this path,
        // so accepting status from body and PATCH /status are equivalent.
        if (isUpdate) {
            PurchaseRequestStatus parsed = StatusParser.parseOrNull(PurchaseRequestStatus.class, req.status());
            if (parsed != null) pr.setStatus(parsed);
        }
        pr.setNotes(req.notes());
    }
}
