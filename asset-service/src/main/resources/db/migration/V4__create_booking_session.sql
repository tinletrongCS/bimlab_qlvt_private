-- Thêm bảng để lưu lại thông tin của 1 phiên đặt phòng họp
-- V4__create_asset_booking_sessions.sql

CREATE SCHEMA IF NOT EXISTS asset;

CREATE TABLE asset.asset_booking_sessions (
    id BIGSERIAL PRIMARY KEY,

    asset_id BIGINT NOT NULL,

    booking_code VARCHAR(80) NOT NULL UNIQUE,

    title VARCHAR(255) NOT NULL,
    purpose VARCHAR(1000),

    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,

    requested_by_employee_id BIGINT,
    department_id BIGINT,
    site_id BIGINT,
    project_id BIGINT,

    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED',

    auto_release BOOLEAN NOT NULL DEFAULT TRUE,

    checked_in_at TIMESTAMP,
    checked_out_at TIMESTAMP,

    approved_by VARCHAR(200),
    cancelled_by VARCHAR(200),
    cancelled_at TIMESTAMP,
    cancel_reason VARCHAR(1000),

    notes VARCHAR(1000),

    created_by VARCHAR(200),
    updated_by VARCHAR(200),

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_asset_booking_sessions_asset
        FOREIGN KEY (asset_id)
        REFERENCES asset.assets(id),

    CONSTRAINT chk_asset_booking_time
        CHECK (end_time > start_time),

    CONSTRAINT chk_asset_booking_status
        CHECK (
            status IN (
                'DRAFT',
                'PENDING_APPROVAL',
                'CONFIRMED',
                'IN_USE',
                'COMPLETED',
                'CANCELLED',
                'REJECTED',
                'EXPIRED'
            )
        )
);

CREATE INDEX idx_asset_booking_sessions_asset_id
    ON asset.asset_booking_sessions(asset_id);

CREATE INDEX idx_asset_booking_sessions_time
    ON asset.asset_booking_sessions(start_time, end_time);

CREATE INDEX idx_asset_booking_sessions_status
    ON asset.asset_booking_sessions(status);

CREATE INDEX idx_asset_booking_sessions_requested_by
    ON asset.asset_booking_sessions(requested_by_employee_id);

CREATE INDEX idx_asset_booking_sessions_department
    ON asset.asset_booking_sessions(department_id);

CREATE INDEX idx_asset_booking_sessions_site
    ON asset.asset_booking_sessions(site_id);