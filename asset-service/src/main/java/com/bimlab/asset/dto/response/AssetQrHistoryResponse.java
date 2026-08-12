package com.bimlab.asset.dto.response;

import java.time.LocalDateTime;
import java.util.Map;

public record AssetQrHistoryResponse(
        String action,
        String title,
        String summary,
        LocalDateTime occurredAt,
        String approvedByName,
        String approvedByUsername,
        Map<String, Object> beforeData,
        Map<String, Object> afterData,
        Map<String, Object> changedFields
) {}
