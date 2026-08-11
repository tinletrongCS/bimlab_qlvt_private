package com.bimlab.asset.entity.status;

/**
 * Type-safe lifecycle states for {@link com.bimlab.asset.entity.AssetItem}.
 * Persisted as {@code VARCHAR(30)} via {@code @Enumerated(EnumType.STRING)},
 * so DB rows stay human-readable and existing data does not require migration.
 */
public enum AssetStatus {
    IN_STOCK,
    ASSIGNED,
    MAINTENANCE,
    LOST,
    DISPOSED,
    PENDING
}
