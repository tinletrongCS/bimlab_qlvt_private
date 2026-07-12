package com.bimlab.asset.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.bimlab.asset.model.AssetBookingSession;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.status.AssetBookingStatus;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class AssetBookingMapperTest {
    private final AssetBookingMapper mapper = new AssetBookingMapper();

    @Test
    void mapsBookingAndNestedAsset() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 10, 8, 0);
        AssetBookingSession booking = AssetBookingSession.builder()
                .id(1L).asset(AssetItem.builder().id(2L).assetCode("ROOM-1").name("Meeting room").build())
                .bookingCode("BK-1").title("Planning").purpose("Weekly meeting")
                .startTime(now).endTime(now.plusHours(1)).requestedByEmployeeId(3L)
                .departmentId(4L).siteId(5L).projectId(6L).status(AssetBookingStatus.CONFIRMED)
                .autoRelease(true).checkedInAt(now.plusMinutes(1)).checkedOutAt(now.plusMinutes(50))
                .approvedBy("boss").cancelledBy("none").cancelledAt(now.plusDays(1))
                .cancelReason("reason").notes("notes").createdBy("alice").updatedBy("bob")
                .createdAt(now.minusDays(1)).updatedAt(now).build();

        var result = mapper.toResponse(booking);

        assertThat(result.assetId()).isEqualTo(2L);
        assertThat(result.assetCode()).isEqualTo("ROOM-1");
        assertThat(result.assetName()).isEqualTo("Meeting room");
        assertThat(result.bookingCode()).isEqualTo("BK-1");
        assertThat(result.status()).isEqualTo(AssetBookingStatus.CONFIRMED);
        assertThat(result.updatedBy()).isEqualTo("bob");
    }

    @Test
    void mapsMissingAssetAsNull() {
        var result = mapper.toResponse(AssetBookingSession.builder().id(1L).build());

        assertThat(result.assetId()).isNull();
        assertThat(result.assetCode()).isNull();
        assertThat(result.assetName()).isNull();
    }
}
