package com.bimlab.asset.controller;

import com.bimlab.asset.config.TestSecurityConfig;
import com.bimlab.asset.mapper.ContractMapper;
import com.bimlab.asset.mapper.PurchaseRequestMapper;
import com.bimlab.asset.mapper.VendorMapper;
import com.bimlab.asset.model.Contract;
import com.bimlab.asset.model.status.ContractStatus;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.ContractService;
import com.bimlab.asset.storage.MinioService;
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

@WebMvcTest(ContractController.class)
@Import({
        TestSecurityConfig.class,
        ContractMapper.class,
        PurchaseRequestMapper.class,
        VendorMapper.class
})
@AutoConfigureMockMvc(addFilters = false)
class ContractControllerWebMvcTest {

    @Autowired MockMvc mockMvc;
    @MockBean ContractService contractService;
    @MockBean MinioService minioService;
    @MockBean AssetAccessService assetAccessService;

    private Contract sample() {
        return Contract.builder()
                .id(1L)
                .contractNumber("HD-001")
                .title("Service contract")
                .status(ContractStatus.DRAFT)
                .build();
    }

    @Test
    @WithMockUser(authorities = {"asset_access"})
    void list_returnsContracts() throws Exception {
        when(contractService.listContracts()).thenReturn(List.of(sample()));
        mockMvc.perform(get("/api/asset/contracts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].contractNumber").value("HD-001"));
    }

    @Test
    @WithMockUser(authorities = {"asset_access"})
    void listPaged_returnsPage() throws Exception {
        when(contractService.listContractsPaged(any())).thenReturn(new PageImpl<>(List.of(sample())));
        mockMvc.perform(get("/api/asset/contracts/paged"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].contractNumber").value("HD-001"));
    }

    @Test
    @WithMockUser(authorities = {"some_unrelated_perm"})
    void get_forbiddenForWrongPermission() throws Exception {
        mockMvc.perform(get("/api/asset/contracts/1"))
                .andExpect(status().isForbidden());
    }
}
