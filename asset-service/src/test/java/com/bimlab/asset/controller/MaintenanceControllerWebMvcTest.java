package com.bimlab.asset.controller;

import com.bimlab.asset.config.TestSecurityConfig;
import com.bimlab.asset.mapper.AssetMapper;
import com.bimlab.asset.mapper.MaintenanceRecordMapper;
import com.bimlab.asset.mapper.VendorMapper;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.MaintenanceRecord;
import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.model.status.MaintenanceStatus;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.AssetService;
import com.bimlab.asset.service.MaintenanceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MaintenanceController.class)
@Import({
        TestSecurityConfig.class,
        MaintenanceRecordMapper.class,
        AssetMapper.class,
        VendorMapper.class
})
@AutoConfigureMockMvc(addFilters = false)
class MaintenanceControllerWebMvcTest {

    @Autowired MockMvc mockMvc;
    @MockBean MaintenanceService maintenanceService;
    @MockBean AssetService assetService;
    @MockBean AssetAccessService assetAccessService;

    private MaintenanceRecord sample() {
        AssetItem asset = AssetItem.builder().id(1L).assetCode("LAP-1").name("Laptop").category("IT").status(AssetStatus.ASSIGNED).build();
        return MaintenanceRecord.builder()
                .id(1L)
                .asset(asset)
                .maintenanceType("PREVENTIVE")
                .maintenanceDate(LocalDate.now())
                .status(MaintenanceStatus.COMPLETED)
                .build();
    }

    @Test
    @WithMockUser(authorities = {"asset_access"})
    void list_returnsRecords() throws Exception {
        when(maintenanceService.listMaintenanceRecords()).thenReturn(List.of(sample()));
        mockMvc.perform(get("/api/asset/maintenance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].maintenanceType").value("PREVENTIVE"));
    }

    @Test
    @WithMockUser(authorities = {"asset_access"})
    void listPaged_returnsPage() throws Exception {
        when(maintenanceService.listMaintenanceRecordsPaged(any()))
                .thenReturn(new PageImpl<>(List.of(sample())));
        mockMvc.perform(get("/api/asset/maintenance/paged"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].maintenanceType").value("PREVENTIVE"));
    }
}
