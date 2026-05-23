package com.bimlab.asset.security;

import java.security.Principal;

/**
 * Authentication principal for QLVT requests.
 *
 * F1: previously the JWT filter set the principal to the bare username String
 * (sub claim), so authorization checks had no way to know the caller's
 * employeeId. AssetAccessService.ensureSelfOrAny(...) now needs employeeId to
 * gate self-scoped views; this principal carries it.
 *
 * Implements java.security.Principal so Authentication.getName() still returns
 * username (back-compat with any code that calls auth.getName()).
 */
public record AssetPrincipal(String username, Long employeeId) implements Principal {
    @Override
    public String getName() {
        return username;
    }
}
