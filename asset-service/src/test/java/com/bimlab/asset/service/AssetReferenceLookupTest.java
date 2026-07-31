package com.bimlab.asset.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssetReferenceLookupTest {
    @Mock
    JdbcTemplate jdbc;

    @Test
    void resolvesSharedHrmNamesAndFallsBackWhenReferenceIsUnavailable() {
        AssetReferenceLookup lookup = new AssetReferenceLookup(jdbc);
        when(jdbc.queryForObject(
                "select full_name from hrm.employees where id = ?", String.class, 1L
        )).thenReturn("Nguyễn Văn A");
        when(jdbc.queryForObject(
                "select name from hrm.departments where id = ?", String.class, 2L
        )).thenReturn("Phòng Kỹ thuật");
        when(jdbc.queryForObject(
                "select name from hrm.work_sites where id = ?", String.class, 3L
        )).thenThrow(new DataAccessResourceFailureException("hrm down"));
        when(jdbc.queryForObject(
                "select full_name from auth.users where username = ?", String.class, "admin"
        )).thenReturn("Quản trị viên");

        assertThat(lookup.employeeName(1L)).isEqualTo("Nguyễn Văn A");
        assertThat(lookup.employeeName(null, "admin")).isEqualTo("Quản trị viên");
        assertThat(lookup.departmentName(2L)).isEqualTo("Phòng Kỹ thuật");
        assertThat(lookup.siteName(3L)).isNull();
        assertThat(lookup.siteName(null)).isEqualTo("BIMLAB");
        assertThat(lookup.employeeName(null)).isNull();
    }
}
