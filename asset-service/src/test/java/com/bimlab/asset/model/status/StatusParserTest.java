package com.bimlab.asset.model.status;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class StatusParserTest {

    @Test
    void parseTrimsAndUppercasesEnumValues() {
        assertEquals(AssetStatus.IN_STOCK, StatusParser.parse(AssetStatus.class, " in_stock "));
        assertEquals(PurchaseRequestStatus.PENDING, StatusParser.parse(PurchaseRequestStatus.class, "pending"));
    }

    @Test
    void parseRejectsBlankAndUnknownValues() {
        assertThrows(IllegalArgumentException.class, () -> StatusParser.parse(AssetStatus.class, null));
        assertThrows(IllegalArgumentException.class, () -> StatusParser.parse(AssetStatus.class, " "));
        assertThrows(IllegalArgumentException.class, () -> StatusParser.parse(AssetStatus.class, "retired"));
    }

    @Test
    void parseOrNullReturnsNullOnlyForMissingValues() {
        assertNull(StatusParser.parseOrNull(AssetStatus.class, null));
        assertNull(StatusParser.parseOrNull(AssetStatus.class, " "));
        assertEquals(AssetStatus.ASSIGNED, StatusParser.parseOrNull(AssetStatus.class, "assigned"));
        assertThrows(IllegalArgumentException.class, () -> StatusParser.parseOrNull(AssetStatus.class, "bad"));
    }
}
