package com.bimlab.asset.controller;

import com.bimlab.asset.dto.request.AssetBookingCancelRequest;
import com.bimlab.asset.dto.request.AssetBookingCheckoutRequest;
import com.bimlab.asset.dto.request.AssetBookingRequest;
import com.bimlab.asset.dto.response.AssetBookingAvailabilityResponse;
import com.bimlab.asset.dto.response.AssetBookingResponse;
import com.bimlab.asset.service.AssetBookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/asset/bookings")
@RequiredArgsConstructor
public class AssetBookingController {
    private final AssetBookingService service;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage')")
    public List<AssetBookingResponse> list(
            @RequestParam(required = false) Long assetId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toTime
    ) {
        return service.listBookings(assetId, status, fromTime, toTime);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage')")
    public AssetBookingResponse get(@PathVariable Long id) {
        return service.getBooking(id);
    }

    @GetMapping("/availability")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_view_self','asset_view_team','asset_view_all','asset_manage')")
    public AssetBookingAvailabilityResponse availability(
            @RequestParam Long assetId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime
    ) {
        return service.checkAvailability(assetId, startTime, endTime);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('asset_access','asset_manage')")
    public AssetBookingResponse create(@Valid @RequestBody AssetBookingRequest req) {
        return service.createBooking(req);
    }

    @PostMapping("/{id}/check-in")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_manage')")
    public AssetBookingResponse checkIn(@PathVariable Long id) {
        return service.checkIn(id);
    }

    @PostMapping("/{id}/check-out")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_manage')")
    public AssetBookingResponse checkOut(@PathVariable Long id, @Valid @RequestBody AssetBookingCheckoutRequest req) {
        return service.checkOut(id, req);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyAuthority('asset_access','asset_manage')")
    public AssetBookingResponse cancel(@PathVariable Long id, @Valid @RequestBody AssetBookingCancelRequest req) {
        return service.cancel(id, req);
    }

    @PostMapping("/auto-release-due")
    @PreAuthorize("hasAuthority('asset_manage')")
    public List<AssetBookingResponse> autoReleaseDue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime now
    ) {
        return service.autoReleaseDue(now);
    }
}
