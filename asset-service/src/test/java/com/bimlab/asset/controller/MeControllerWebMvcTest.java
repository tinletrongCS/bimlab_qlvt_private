package com.bimlab.asset.controller;

import com.bimlab.asset.config.TestSecurityConfig;
import com.bimlab.asset.security.JwtAuthenticationFilter;
import com.bimlab.asset.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * PA-B — GET /api/asset/me trả role + permissions từ authorities trong SecurityContext.
 */
@WebMvcTest(MeController.class)
@Import(TestSecurityConfig.class)
@AutoConfigureMockMvc(addFilters = false)
class MeControllerWebMvcTest {

    @Autowired
    MockMvc mockMvc;

    // Production SecurityConfig kéo JwtAuthenticationFilter (@Component) → mock để @WebMvcTest slice load được.
    @MockBean
    JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockBean
    JwtTokenProvider jwtTokenProvider;

    @Test
    @WithMockUser(username = "alice", authorities = {"ROLE_ADMIN", "asset_manage", "asset_view_all"})
    void me_returnsRoleAndPermissions() throws Exception {
        mockMvc.perform(get("/api/asset/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.permissions.length()").value(2))
                .andExpect(jsonPath("$.permissions[?(@ == 'asset_manage')]").exists())
                .andExpect(jsonPath("$.permissions[?(@ == 'asset_view_all')]").exists());
    }

    @Test
    @WithMockUser(username = "bob", authorities = {"ROLE_EMPLOYEE"})
    void me_roleOnly_emptyPermissions() throws Exception {
        mockMvc.perform(get("/api/asset/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("bob"))
                .andExpect(jsonPath("$.role").value("EMPLOYEE"))
                .andExpect(jsonPath("$.permissions.length()").value(0));
    }
}
