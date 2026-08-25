package com.bimlab.asset.controller;

import com.bimlab.asset.config.TestSecurityConfig;
import com.bimlab.asset.dto.request.AssetCatalogItemRequest;
import com.bimlab.asset.dto.request.AssetCatalogUnassignmentRequest;
import com.bimlab.asset.dto.response.AssetCatalogItemDetailResponse;
import com.bimlab.asset.dto.response.AssetCatalogItemListResponse;
import com.bimlab.asset.entity.AssetCatalogItem;
import com.bimlab.asset.entity.AssetItem;
import com.bimlab.asset.entity.status.CatalogType;
import com.bimlab.asset.entity.status.CatalogUnit;
import com.bimlab.asset.mapper.AssetMapper;
import com.bimlab.asset.security.AssetAccessService;
import com.bimlab.asset.service.AssetCatalogItemService;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AssetCatalogItemController.class)
@Import({TestSecurityConfig.class, AssetMapper.class})
@AutoConfigureMockMvc(addFilters = false)
class AssetCatalogItemControllerWebMvcTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    @MockBean AssetCatalogItemService service;
    @MockBean AssetAccessService assetAccessService;

    @Test
    @WithMockUser(authorities = "asset_access")
    void listAndActiveOptionsReturnProjections() throws Exception {
        AssetCatalogItemListResponse item = summary();
        when(service.listCatalogItems(any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(item)));
        when(service.listActiveCatalogItemsByCategory(10L)).thenReturn(List.of(item));

        mockMvc.perform(get("/api/asset/catalog-items").param("keyword", "LG"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].itemCode").value("MON-LG-27"));
        mockMvc.perform(get("/api/asset/catalog-items/active").param("categoryId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].categoryId").value(10));
    }

    @Test
    @WithMockUser(authorities = "asset_view_all")
    void getReturnsDetail() throws Exception {
        when(service.getCatalogItem(1L)).thenReturn(detail());

        mockMvc.perform(get("/api/asset/catalog-items/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Màn hình LG 144Hz 27inch"));
    }

    @Test
    @WithMockUser(authorities = "asset_manage")
    void createAndUpdateValidateThenDelegate() throws Exception {
        AssetCatalogItemRequest request = request();
        when(service.createCatalogItem(any())).thenReturn(detail());
        when(service.updateCatalogItem(eq(1L), any())).thenReturn(detail());
        String body = objectMapper.writeValueAsString(request);

        mockMvc.perform(post("/api/asset/catalog-items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
        mockMvc.perform(put("/api/asset/catalog-items/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(authorities = "asset_manage")
    void deactivateReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/asset/catalog-items/1"))
                .andExpect(status().isNoContent());

        verify(service).deactivateCatalogItem(1L);
    }

    @Test
    @WithMockUser(authorities = "asset_view_all")
    void listAssignedAssetsReturnsMappedAssets() throws Exception {
        when(service.listAssignedAssets(1L)).thenReturn(List.of(asset(7L)));

        mockMvc.perform(get("/api/asset/catalog-items/1/assets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(7))
                .andExpect(jsonPath("$[0].assetCode").value("ASSET-7"));
    }

    @Test
    @WithMockUser(authorities = "asset_manage")
    void unassignSingleAndBulkThenPermanentDeleteReturnNoContent() throws Exception {
        String body = objectMapper.writeValueAsString(new AssetCatalogUnassignmentRequest(List.of(7L, 8L)));

        mockMvc.perform(delete("/api/asset/catalog-items/1/assets/7"))
                .andExpect(status().isNoContent());
        mockMvc.perform(post("/api/asset/catalog-items/1/assets/unassign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNoContent());
        mockMvc.perform(delete("/api/asset/catalog-items/1/permanent"))
                .andExpect(status().isNoContent());

        verify(service).unassignAsset(1L, 7L);
        verify(service).unassignAssets(eq(1L), any());
        verify(service).deleteCatalogItem(1L);
    }

    @Test
    @WithMockUser(authorities = "asset_view_self")
    void createIsForbiddenForReadOnlyUser() throws Exception {
        mockMvc.perform(post("/api/asset/catalog-items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request())))
                .andExpect(status().isForbidden());
    }

    private AssetCatalogItemRequest request() {
        return new AssetCatalogItemRequest(
                "Màn hình LG 144Hz 27inch", 10L, CatalogType.ASSET,
                null, CatalogUnit.CAI, null, null, null, null, null, true
        );
    }

    private AssetCatalogItemListResponse summary() {
        return new AssetCatalogItemListResponse(
                1L, "MON-LG-27", "Màn hình LG 144Hz 27inch", CatalogType.ASSET,
                10L, "MONITOR", "Màn hình", "Cái", true
        );
    }

    private AssetCatalogItemDetailResponse detail() {
        return new AssetCatalogItemDetailResponse(
                1L, "MON-LG-27", "Màn hình LG 144Hz 27inch", CatalogType.ASSET,
                10L, "MONITOR", "Màn hình", null, "Cái",
                null, null, null, null, null, true, null, null
        );
    }

    private AssetItem asset(Long id) {
        return AssetItem.builder()
                .id(id)
                .assetCode("ASSET-" + id)
                .name("Màn hình LG")
                .catalogItem(AssetCatalogItem.builder()
                        .id(1L)
                        .itemCode("MON-LG-27")
                        .name("Màn hình LG 144Hz 27inch")
                        .build())
                .build();
    }
}
