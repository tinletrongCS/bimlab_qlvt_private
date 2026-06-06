package com.bimlab.asset.controller;

import com.bimlab.asset.config.TestSecurityConfig;
import com.bimlab.asset.model.PurchaseRequest;
import com.bimlab.asset.model.status.PurchaseRequestStatus;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.PurchaseRequestService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PurchaseRequestController.class)
@Import(TestSecurityConfig.class)
@AutoConfigureMockMvc(addFilters = false)
class PurchaseRequestControllerWebMvcTest {

    @Autowired MockMvc mockMvc;
    @MockBean PurchaseRequestService purchaseRequestService;
    @MockBean AssetAccessService assetAccessService;

    private PurchaseRequest sample() {
        return PurchaseRequest.builder()
                .id(1L)
                .requestType("DEVICE")
                .title("Laptop request")
                .status(PurchaseRequestStatus.PENDING)
                .build();
    }

    @Test
    @WithMockUser(authorities = {"asset_access"})
    void list_returnsRequests() throws Exception {
        when(purchaseRequestService.listPurchaseRequests()).thenReturn(List.of(sample()));
        mockMvc.perform(get("/api/asset/purchase-requests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Laptop request"));
    }

    @Test
    @WithMockUser(authorities = {"asset_access"})
    void listPaged_returnsPage() throws Exception {
        when(purchaseRequestService.listPurchaseRequestsPaged(any()))
                .thenReturn(new PageImpl<>(List.of(sample())));
        mockMvc.perform(get("/api/asset/purchase-requests/paged"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Laptop request"));
    }
}
