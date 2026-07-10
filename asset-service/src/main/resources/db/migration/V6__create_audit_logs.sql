CREATE TABLE IF NOT EXISTS asset.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),

    actor_employee_id BIGINT,
    actor_username VARCHAR(100),
    actor_role VARCHAR(50),

    module VARCHAR(50) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id BIGINT,
    entity_code VARCHAR(100),

    action VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    summary TEXT NOT NULL,

    before_data JSONB,
    after_data JSONB,
    changed_fields JSONB,

    request_id VARCHAR(100),
    ip_address VARCHAR(64),
    user_agent TEXT,

    CONSTRAINT chk_audit_logs_severity
        CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred_at
    ON asset.audit_logs(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
    ON asset.audit_logs(entity_type, entity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_code
    ON asset.audit_logs(entity_code, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
    ON asset.audit_logs(actor_employee_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_module_action
    ON asset.audit_logs(module, action, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_fields_gin
    ON asset.audit_logs USING GIN (changed_fields);
