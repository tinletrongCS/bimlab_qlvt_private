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

    public String departmentName(Long id) {
        return findName("select name from hrm.departments where id = ?", id);
    }

    public String siteName(Long id) {
        return findName("select name from hrm.work_sites where id = ?", id);
    }

    private String findName(String sql, Long id) {
        if (id == null) {
            return null;
        }
        try {
            return jdbc.queryForObject(sql, String.class, id);
        } catch (DataAccessException ignored) {
            // ponytail: QLVT hiện dùng DB chung; fallback null khi reference chưa có hoặc DB đã tách.
            return null;
        }
    }
}
