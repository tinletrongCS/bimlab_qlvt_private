package com.bimlab.asset.controller;

import com.bimlab.asset.config.TestSecurityConfig;
import com.bimlab.asset.mapper.AssetMapper;
import com.bimlab.asset.mapper.AssetTransferMapper;
import com.bimlab.asset.dto.response.AssetTransferHeaderResponse;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.AssetService;
import com.bimlab.asset.service.AssetTransferService;
import com.bimlab.asset.storage.MinioService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AssetTransferController.class)
@Import({TestSecurityConfig.class, AssetTransferMapper.class, AssetMapper.class})
@AutoConfigureMockMvc(addFilters = false)
class AssetTransferControllerWebMvcTest {

    @Autowired MockMvc mockMvc;
    @MockBean AssetTransferService assetTransferService;
    @MockBean AssetService assetService;
    @MockBean AssetAccessService assetAccessService;
    @MockBean MinioService minioService;

    private AssetTransferHeaderResponse sample() {
        return new AssetTransferHeaderResponse(
                1L,
                "PBG-0001",
                "Cấp phát tài sản",
                "ASSIGN",
                "DRAFT",
                null,
                42L,
                null,
                null,
                null,
                null,
                null,
                null,
                LocalDate.now(),
                null,
                "Cấp phát",
                null,
                "admin",
                1L,
                null,
                null,
                null,
                null,
                List.of(),
                List.of(),
                List.of()
        );
    }

    @Test
    @WithMockUser(authorities = {"asset_transfers_view"})
    void list_returnsTransferHeaders() throws Exception {
        when(assetTransferService.listTransferHeaders()).thenReturn(List.of(sample()));
        mockMvc.perform(get("/api/asset/transfer"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].transferType").value("ASSIGN"));
    }

    @Test
    @WithMockUser(authorities = {"asset_transfers_view"})
    void get_returnsTransferHeader() throws Exception {
        when(assetTransferService.getTransferHeader(1L)).thenReturn(sample());
        mockMvc.perform(get("/api/asset/transfer/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transferCode").value("PBG-0001"));
    }

    @Test
    @WithMockUser(authorities = {"asset_transfers_manage"})
    void create_returnsTransferHeader() throws Exception {
        when(assetTransferService.createTransferPendingApproval(any())).thenReturn(sample());

        mockMvc.perform(post("/api/asset/transfer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Cấp phát tài sản",
                                  "transferType": "ASSIGN",
                                  "toEmployeeId": 42,
                                  "transferDate": "2026-06-18",
                                  "plannedHandoverAt": "2026-06-18T09:00:00",
                                  "lines": [{"assetId": 1}]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transferType").value("ASSIGN"));
    }
}
