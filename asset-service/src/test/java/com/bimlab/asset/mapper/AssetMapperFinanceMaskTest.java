package com.bimlab.asset.mapper;

import com.bimlab.asset.dto.response.AssetResponse;
import com.bimlab.asset.model.AssetItem;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Khoá hành vi che dữ liệu tài chính theo permission {@code asset_finance_view}:
 * người chỉ có {@code asset_access} nhận response với các trường tiền tệ null,
 * các trường nghiệp vụ khác giữ nguyên.
 */
class AssetMapperFinanceMaskTest {

    private final AssetMapper mapper = new AssetMapper();

    private AssetItem financedAsset() {
        return AssetItem.builder()
                .id(7L)
                .assetCode("TS-007")
                .name("Máy toàn đạc")
                .serialNumber("SN-1")
                .originalCost(new BigDecimal("100000000"))
                .purchaseCost(new BigDecimal("95000000"))
                .accumulatedDepreciation(new BigDecimal("20000000"))
                .bookValue(new BigDecimal("80000000"))
                .residualValue(new BigDecimal("5000000"))
                .depreciationRate(new BigDecimal("12.5"))
                .disposalPrice(new BigDecimal("1000000"))
                .build();
    }

    @Test
    void toResponse_withoutFinance_masksAllMoneyFields() {
        AssetResponse r = mapper.toResponse(financedAsset(), false);
        assertNull(r.originalCost());
        assertNull(r.purchaseCost());
        assertNull(r.accumulatedDepreciation());
        assertNull(r.bookValue());
        assertNull(r.residualValue());
        assertNull(r.depreciationRate());
        assertNull(r.disposalPrice());
        // Trường không phải tài chính giữ nguyên
        assertEquals("TS-007", r.assetCode());
        assertEquals("Máy toàn đạc", r.name());
        assertEquals("SN-1", r.serialNumber());
    }

    @Test
    void toResponse_withFinance_keepsMoneyFields() {
        AssetResponse r = mapper.toResponse(financedAsset(), true);
        assertEquals(new BigDecimal("95000000"), r.purchaseCost());
        assertEquals(new BigDecimal("80000000"), r.bookValue());
    }

    @Test
    void toResponse_singleArg_keepsFinance_forManageFlows() {
        AssetResponse r = mapper.toResponse(financedAsset());
        assertEquals(new BigDecimal("100000000"), r.originalCost());
    }
}
