package com.bimlab.asset.controller;

import com.bimlab.asset.config.TestSecurityConfig;
import com.bimlab.asset.entity.AssetItem;
import com.bimlab.asset.entity.status.AssetStatus;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.AssetService;
import com.bimlab.asset.service.AuditLogService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuditLogController.class)
@Import(TestSecurityConfig.class)
@AutoConfigureMockMvc(addFilters = false)
class AuditLogControllerWebMvcTest {

    @Autowired MockMvc mockMvc;
    @MockBean AuditLogService auditLogService;
    @MockBean AssetService assetService;
    @MockBean AssetAccessService access;

    @Test
    @WithMockUser(authorities = "asset_report_view")
    void byEntity_returnsPage() throws Exception {
        when(auditLogService.listByEntity(any(), any(), any())).thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/asset/logs")
                        .param("entityType", "ASSET")
                        .param("entityId", "12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    @WithMockUser(authorities = "asset_view_self")
    void byAsset_checksAccessAndReturnsPage() throws Exception {
        AssetItem asset = AssetItem.builder()
                .id(12L)
                .assignedEmployeeId(7L)
                .status(AssetStatus.ASSIGNED)
                .build();
        when(assetService.getAssetById(12L)).thenReturn(asset);
        when(auditLogService.listByEntity(any(), any(), any())).thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/asset/logs/assets/12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));

        verify(access).ensureSelfOrAny(any(), any());
    }
}
