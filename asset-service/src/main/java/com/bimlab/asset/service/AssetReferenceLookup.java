package com.bimlab.asset.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AssetReferenceLookup {
    private final JdbcTemplate jdbc;

    public String employeeName(Long id) {
        return findName("select full_name from hrm.employees where id = ?", id);
    }

    public String employeeName(Long id, String username) {
        String name = employeeName(id);
        return name != null ? name : findName("select full_name from auth.users where username = ?", username);
    }

    public String departmentName(Long id) {
        return findName("select name from hrm.departments where id = ?", id);
    }

    public String siteName(Long id) {
        if (id == null) {
            return "BIMLAB";
        }
        return findName("select name from hrm.work_sites where id = ?", id);
    }

    private String findName(String sql, Object value) {
        if (value == null) {
            return null;
        }
        try {
            return jdbc.queryForObject(sql, String.class, value);
        } catch (DataAccessException ignored) {
            // Reference data can be temporarily unavailable while shared services are starting.
            return null;
        }
    }
}
