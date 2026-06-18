package com.bimlab.asset.controller;

import com.bimlab.asset.config.TestSecurityConfig;
import com.bimlab.asset.mapper.AssetMapper;
import com.bimlab.asset.mapper.AssetTransferMapper;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.AssetTransfer;
import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.AssetService;
import com.bimlab.asset.service.AssetTransferService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
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

    private AssetTransfer sample() {
        AssetItem asset = AssetItem.builder().id(1L).assetCode("LAP-1").name("Laptop").category("IT").status(AssetStatus.ASSIGNED).build();
        return AssetTransfer.builder()
                .id(1L)
                .asset(asset)
                .transferType("ASSIGN")
                .transferDate(LocalDate.now())
                .build();
    }

    @Test
    @WithMockUser(authorities = {"asset_access"})
    void list_returnsTransfers() throws Exception {
        when(assetTransferService.listTransfers()).thenReturn(List.of(sample()));
        mockMvc.perform(get("/api/asset/transfers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].transferType").value("ASSIGN"));
    }

    @Test
    @WithMockUser(authorities = {"asset_access"})
    void listPaged_returnsPage() throws Exception {
        when(assetTransferService.listTransfersPaged(any())).thenReturn(new PageImpl<>(List.of(sample())));
        mockMvc.perform(get("/api/asset/transfers/paged"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].transferType").value("ASSIGN"));
    }

    @Test
    @WithMockUser(authorities = {"asset_manage"})
    void create_returnsMappedTransfer() throws Exception {
        when(assetTransferService.createTransfer(any())).thenReturn(sample());

        mockMvc.perform(post("/api/asset/transfers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "assetId": 1,
                                  "transferType": "ASSIGN",
                                  "toEmployeeId": 42,
                                  "transferDate": "2026-06-18",
                                  "applyToAsset": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transferType").value("ASSIGN"))
                .andExpect(jsonPath("$.asset.assetCode").value("LAP-1"));
    }
}
