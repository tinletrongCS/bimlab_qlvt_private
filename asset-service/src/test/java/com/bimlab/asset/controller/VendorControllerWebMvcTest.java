package com.bimlab.asset.controller;

import com.bimlab.asset.config.TestSecurityConfig;
import com.bimlab.asset.mapper.VendorMapper;
import com.bimlab.asset.dto.request.VendorRequest;
import com.bimlab.asset.model.Vendor;
import com.bimlab.asset.model.status.VendorStatus;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.VendorService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Q8: HTTP-layer contract tests for VendorController. Mirror coverage for the
 * other 6 list-bearing controllers is in their own *WebMvcTest classes.
 */
@WebMvcTest(VendorController.class)
@Import({TestSecurityConfig.class, VendorMapper.class})
@AutoConfigureMockMvc(addFilters = false)
class VendorControllerWebMvcTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean VendorService vendorService;
    // Q1 declarative gate doesn't reference AssetAccessService here, but other
    // controllers do; mocking it keeps the slice config reusable.
    @MockBean AssetAccessService assetAccessService;

    private Vendor sampleVendor() {
        return Vendor.builder()
                .id(1L)
                .name("Acme Corp")
                .taxCode("0123456789")
                .contactName("Alice")
                .email("alice@acme.test")
                .phone("0900000000")
                .address("Hà Nội")
                .status(VendorStatus.ACTIVE)
                .build();
    }

    @Test
    @WithMockUser(authorities = {"asset_access"})
    void list_returnsVendors_forReader() throws Exception {
        when(vendorService.listVendors()).thenReturn(List.of(sampleVendor()));
        mockMvc.perform(get("/api/asset/vendors"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Acme Corp"))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"));
    }

    // Note: anonymous-request coverage is omitted intentionally — the JWT
    // filter handles 401 in production and is intentionally stripped from this
    // slice (@AutoConfigureMockMvc(addFilters = false)). Coverage focuses on
    // @PreAuthorize correctness for authenticated principals.

    @Test
    @WithMockUser(authorities = {"some_unrelated_perm"})
    void list_returnsForbidden_forWrongPermission() throws Exception {
        mockMvc.perform(get("/api/asset/vendors"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {"asset_access"})
    void listPaged_returnsPageEnvelope() throws Exception {
        when(vendorService.listVendorsPaged(any()))
                .thenReturn(new PageImpl<>(List.of(sampleVendor())));
        mockMvc.perform(get("/api/asset/vendors/paged"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Acme Corp"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @WithMockUser(authorities = {"vendor_manage"})
    void create_persistsAndReturnsVendor() throws Exception {
        Vendor saved = sampleVendor();
        when(vendorService.createVendor(any(VendorRequest.class))).thenReturn(saved);

        String body = objectMapper.writeValueAsString(new VendorRequest(
                "Acme Corp", "0123456789", "Alice", "alice@acme.test",
                "0900000000", "Hà Nội", "ACTIVE"));

        mockMvc.perform(post("/api/asset/vendors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Acme Corp"));

        verify(vendorService).createVendor(any(VendorRequest.class));
    }

    @Test
    @WithMockUser(authorities = {"asset_view_self"})
    void create_returnsForbidden_forReadOnlyUser() throws Exception {
        String body = objectMapper.writeValueAsString(new VendorRequest(
                "Acme", null, null, null, null, null, "ACTIVE"));
        mockMvc.perform(post("/api/asset/vendors")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {"vendor_manage"})
    void delete_callsService() throws Exception {
        mockMvc.perform(delete("/api/asset/vendors/7"))
                .andExpect(status().isOk());
        verify(vendorService).deleteVendor(eq(7L));
    }
}
