package com.bimlab.asset.dto.response;

import java.util.List;

public record CurrentUserResponse(
        String username,
        String role,
        Long employeeId,
        List<String> permissions
) {}
