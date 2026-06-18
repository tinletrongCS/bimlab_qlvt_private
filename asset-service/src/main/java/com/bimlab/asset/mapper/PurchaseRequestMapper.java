package com.bimlab.asset.mapper;

import com.bimlab.asset.dto.response.PurchaseRequestResponse;
import com.bimlab.asset.model.PurchaseRequest;
import org.springframework.stereotype.Component;

@Component
public class PurchaseRequestMapper {

    public PurchaseRequestResponse toResponse(PurchaseRequest request) {
        if (request == null) return null;
        return new PurchaseRequestResponse(
                request.getId(),
                request.getRequestType(),
                request.getTitle(),
                request.getReason(),
                request.getEstimatedCost(),
                request.getRequesterEmployeeId(),
                request.getDepartmentId(),
                request.getSiteId(),
                request.getProjectId(),
                request.getNeededDate(),
                request.getStatus() == null ? null : request.getStatus().name(),
                request.getNotes(),
                request.getCreatedAt(),
                request.getUpdatedAt()
        );
    }
}
