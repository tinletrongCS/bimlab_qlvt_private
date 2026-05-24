package com.bimlab.asset.model.status;

/**
 * Q5: type-safe lifecycle states for {@link com.bimlab.asset.model.AssetItem}.
 * Persisted as {@code VARCHAR(30)} via {@code @Enumerated(EnumType.STRING)},
 * so DB rows stay human-readable and existing data does not require migration.
 */
public enum AssetStatus {
    IN_STOCK,
    ASSIGNED,
    MAINTENANCE,
    DISPOSED,
    PENDING
}
