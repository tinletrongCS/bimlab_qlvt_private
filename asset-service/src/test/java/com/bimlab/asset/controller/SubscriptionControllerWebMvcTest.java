package com.bimlab.asset.controller;

import com.bimlab.asset.config.TestSecurityConfig;
import com.bimlab.asset.model.Subscription;
import com.bimlab.asset.model.status.SubscriptionStatus;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.security.JwtAuthenticationFilter;
import com.bimlab.asset.security.JwtTokenProvider;
import com.bimlab.asset.service.SubscriptionService;
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

@WebMvcTest(SubscriptionController.class)
@Import(TestSecurityConfig.class)
@AutoConfigureMockMvc(addFilters = false)
class SubscriptionControllerWebMvcTest {

    @Autowired MockMvc mockMvc;
    @MockBean SubscriptionService subscriptionService;
    @MockBean AssetAccessService assetAccessService;
    @MockBean JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean JwtTokenProvider jwtTokenProvider;

    private Subscription sample() {
        return Subscription.builder()
                .id(1L)
                .softwareName("Office 365")
                .totalSeats(100)
                .usedSeats(80)
                .status(SubscriptionStatus.ACTIVE)
                .build();
    }

    @Test
    @WithMockUser(authorities = {"asset_access"})
    void list_returnsSubscriptions() throws Exception {
        when(subscriptionService.listSubscriptions()).thenReturn(List.of(sample()));
        mockMvc.perform(get("/api/asset/subscriptions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].softwareName").value("Office 365"));
    }

    @Test
    @WithMockUser(authorities = {"asset_access"})
    void listPaged_returnsPage() throws Exception {
        when(subscriptionService.listSubscriptionsPaged(any())).thenReturn(new PageImpl<>(List.of(sample())));
        mockMvc.perform(get("/api/asset/subscriptions/paged"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].softwareName").value("Office 365"));
    }
}
