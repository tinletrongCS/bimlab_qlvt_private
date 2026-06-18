package com.bimlab.asset.service;

import com.bimlab.asset.dto.request.SubscriptionRequest;
import com.bimlab.asset.model.Subscription;
import com.bimlab.asset.model.status.StatusParser;
import com.bimlab.asset.model.status.SubscriptionStatus;
import com.bimlab.asset.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

/**
 * Q2: Subscription domain split from the original {@code AssetManagementService}.
 * Owns Subscription CRUD. Depends on {@link VendorService} for the
 * {@code vendorId → Vendor} resolution inside {@link #applySubscription}.
 */
@Service
@RequiredArgsConstructor
public class SubscriptionService {
    private final SubscriptionRepository subscriptions;
    private final VendorService vendorService;
    private final AssetService assetService;

    @Transactional(readOnly = true)
    public List<Subscription> listSubscriptions() {
        return subscriptions.findAll();
    }


    @Transactional(readOnly = true)
    public Page<Subscription> listSubscriptionsPaged(Pageable pageable) {
        return subscriptions.findAll(pageable);
    }
    @Transactional(readOnly = true)
    public Subscription getSubscription(Long id) {
        return subscriptions.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Subscription không tồn tại"));
    }

    @Transactional
    public Subscription createSubscription(SubscriptionRequest req) {
        Subscription s = new Subscription();
        applySubscription(s, req);
        return subscriptions.save(s);
    }

    @Transactional
    public Subscription updateSubscription(Long id, SubscriptionRequest req) {
        Subscription s = getSubscription(id);
        applySubscription(s, req);
        return subscriptions.save(s);
    }

    @Transactional
    public void deleteSubscription(Long id) {
        subscriptions.delete(getSubscription(id));
    }

    private void applySubscription(Subscription s, SubscriptionRequest req) {
        s.setSoftwareName(req.softwareName());
        s.setPlanName(req.planName());
        s.setAsset(req.assetId() == null ? null : assetService.getAsset(req.assetId()));
        s.setLicenseKey(req.licenseKey());
        s.setOwnerEmployeeId(req.ownerEmployeeId());
        s.setVendor(req.vendorId() == null ? null : vendorService.getVendor(req.vendorId()));
        s.setTotalSeats(req.totalSeats());
        s.setUsedSeats(req.usedSeats());
        s.setCost(req.cost());
        s.setBillingCycle(req.billingCycle());
        s.setStartDate(req.startDate());
        s.setRenewalDate(req.renewalDate());
        SubscriptionStatus parsed = StatusParser.parseOrNull(SubscriptionStatus.class, req.status());
        if (parsed != null) s.setStatus(parsed);
        s.setNotes(req.notes());
    }
}
