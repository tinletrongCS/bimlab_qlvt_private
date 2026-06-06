package com.bimlab.asset.controller;

import com.bimlab.asset.config.TestSecurityConfig;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.AssetService;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AssetController.class)
@Import(TestSecurityConfig.class)
@AutoConfigureMockMvc(addFilters = false)
class AssetControllerWebMvcTest {

    @Autowired MockMvc mockMvc;
    @MockBean AssetService assetService;
    @MockBean AssetAccessService assetAccessService;

    private AssetItem sample() {
        return AssetItem.builder()
                .id(1L)
                .assetCode("LAP-001")
                .name("MacBook")
                .category("Laptop")
                .status(AssetStatus.IN_STOCK)
                .build();
    }

    @Test
    @WithMockUser(authorities = {"asset_access"})
    void list_returnsAssets() throws Exception {
        when(assetService.listAssets()).thenReturn(List.of(sample()));
        mockMvc.perform(get("/api/asset/assets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].assetCode").value("LAP-001"));
    }

    @Test
    @WithMockUser(authorities = {"asset_access"})
    void listPaged_returnsPage() throws Exception {
        when(assetService.listAssetsPaged(any())).thenReturn(new PageImpl<>(List.of(sample())));
        mockMvc.perform(get("/api/asset/assets/paged"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].assetCode").value("LAP-001"));
    }

    @Test
    @WithMockUser(authorities = {"asset_view_self"})
    void get_appliesScopingCheck() throws Exception {
        when(assetService.getAsset(1L)).thenReturn(sample());
        mockMvc.perform(get("/api/asset/assets/1"))
                .andExpect(status().isOk());
        verify(assetAccessService).ensureSelfOrAny(any(), any());
    }

    @Test
    @WithMockUser(authorities = {"asset_view_self"})
    void delete_rejected_forNonManager() throws Exception {
        mockMvc.perform(delete("/api/asset/assets/1"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {"asset_manage"})
    void delete_acceptedForManager() throws Exception {
        mockMvc.perform(delete("/api/asset/assets/1"))
                .andExpect(status().isOk());
        verify(assetService).deleteAsset(1L);
    }
}
