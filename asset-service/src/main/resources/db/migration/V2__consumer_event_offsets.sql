-- =========================================================================
-- STEP 3.0-b — Consumer cursor cho event polling (CT-4). Schema: asset.
-- QLVT poll hrm.outbox_events (employee.status.changed/deleted) để chặn asset
-- transfer mới khi nhân viên nghỉ. asset-service là service DUY NHẤT trên schema
-- `asset` → không có đồng-tenant Flyway (không cần ignore-migration-patterns).
-- =========================================================================
CREATE TABLE IF NOT EXISTS asset.consumer_event_offsets (
    consumer_name    TEXT        PRIMARY KEY,
    last_sequence_id BIGINT      NOT NULL DEFAULT 0,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
