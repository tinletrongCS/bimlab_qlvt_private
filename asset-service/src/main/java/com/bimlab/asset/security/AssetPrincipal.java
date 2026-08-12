package com.bimlab.asset.security;

import java.security.Principal;


public record AssetPrincipal(String username, Long employeeId) implements Principal {
    @Override
    public String getName() {
        return username;
    }
}
