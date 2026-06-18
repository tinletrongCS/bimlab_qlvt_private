package com.bimlab.asset.dto.request;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record DisposeAssetRequest(
        @NotNull LocalDate disposalDate,
        BigDecimal disposalPrice,
        String disposalReason
) {}
