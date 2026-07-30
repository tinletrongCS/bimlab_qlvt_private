package com.bimlab.asset.controller;

import com.bimlab.asset.dto.request.AssetQrIssueRequest;
import com.bimlab.asset.dto.response.AssetQrHistoryResponse;
import com.bimlab.asset.dto.response.AssetQrIssueResponse;
import com.bimlab.asset.dto.response.AssetQrPublicResponse;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.security.AssetQrAccessPolicy;
import com.bimlab.asset.service.AssetQrService;
import com.bimlab.asset.service.AssetService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssetQrControllerTest {
    @Mock
    AssetQrService qrService;
    @Mock
    AssetService assetService;
    @Mock
    AssetAccessService access;
    @Mock
    AssetQrAccessPolicy accessPolicy;
    @InjectMocks
    AssetQrController controller;

    @Test
    void issueDeduplicatesAssetsAndChecksAccess() {
        AssetItem first = AssetItem.builder().id(1L).assignedEmployeeId(10L).build();
        AssetItem second = AssetItem.builder().id(2L).assignedEmployeeId(20L).build();
        when(assetService.getAssetById(1L)).thenReturn(first);
        when(assetService.getAssetById(2L)).thenReturn(second);
        when(qrService.issue(1L)).thenReturn(new AssetQrIssueResponse(1L, "TS-1", "A", "t1", "u1"));
        when(qrService.issue(2L)).thenReturn(new AssetQrIssueResponse(2L, "TS-2", "B", "t2", "u2"));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setScheme("http");
        request.addHeader("Host", "192.168.110.146:8891");

        List<AssetQrIssueResponse> responses = controller.issue(
                new AssetQrIssueRequest(List.of(1L, 1L, 2L)),
                request
        );

        assertThat(responses).extracting(AssetQrIssueResponse::assetId).containsExactly(1L, 2L);
        assertThat(responses.get(0).publicUrl())
                .isEqualTo("http://192.168.110.146:8891/asset-qr.html?token=t1");
        verify(access).ensureSelfOrAny(10L, com.bimlab.asset.security.Permission.Sets.ASSET_ADMIN);
        verify(access).ensureSelfOrAny(20L, com.bimlab.asset.security.Permission.Sets.ASSET_ADMIN);
    }

    @Test
    void issueRejectsMoreThanOneHundredDistinctAssets() {
        List<Long> ids = LongStream.rangeClosed(1, 101).boxed().toList();

        assertThatThrownBy(() -> controller.issue(
                new AssetQrIssueRequest(ids),
                new MockHttpServletRequest()
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Mỗi lần chỉ được in tối đa 100 mã QR");
    }

    @Test
    void publicAssetRequiresAllowedNetworkOrAuthentication() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        when(accessPolicy.canView(request)).thenReturn(false);

        assertThatThrownBy(() -> controller.publicAsset("token", request))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        error -> assertThat(error.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void publicAssetDelegatesWhenAccessIsAllowed() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        AssetQrPublicResponse response = new AssetQrPublicResponse(
                "TS-1", "Laptop", "ASSIGNED", null, null, null, "FIXED_ASSET",
                null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, List.of()
        );
        when(accessPolicy.canView(request)).thenReturn(true);
        when(qrService.getPublicAsset("token")).thenReturn(response);

        assertThat(controller.publicAsset("token", request)).isSameAs(response);
    }

    @Test
    void publicTransferHistoryDelegatesWhenAccessIsAllowed() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        List<AssetQrHistoryResponse> response = List.of(new AssetQrHistoryResponse(
                "ASSET_CREATED", "Khởi tạo hồ sơ tài sản", "Đã tạo", null,
                null, null,
                Map.of(), Map.of(), Map.of()
        ));
        when(accessPolicy.canView(request)).thenReturn(true);
        when(qrService.getTransferHistory("token")).thenReturn(response);

        assertThat(controller.publicTransferHistory("token", request)).isSameAs(response);
    }
}
