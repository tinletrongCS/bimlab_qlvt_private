-- Backfill họ tên người duyệt/từ chối cho các phiếu cũ từng lưu approved_by = NULL.
-- Audit log giữ username ngay cả khi token Keycloak không có employeeId.
-- Database smoke độc lập không có schema HRM/Auth nên bỏ qua phần backfill tại đó.
DO $migration$
BEGIN
    IF to_regclass('hrm.employees') IS NOT NULL
       AND to_regclass('auth.users') IS NOT NULL THEN
        EXECUTE $sql$
            WITH latest_decision AS (
                SELECT DISTINCT ON (log.entity_id)
                    log.entity_id,
                    COALESCE(employee.full_name, app_user.full_name) AS full_name
                FROM asset.audit_logs log
                LEFT JOIN hrm.employees employee ON employee.id = log.actor_employee_id
                LEFT JOIN auth.users app_user ON app_user.username = log.actor_username
                WHERE log.entity_type = 'ASSET_TRANSFER_HEADER'
                  AND log.action IN ('TRANSFER_APPROVED', 'TRANSFER_REJECTED')
                ORDER BY log.entity_id, log.occurred_at DESC
            )
            UPDATE asset.asset_transfer_headers header
            SET approved_by = decision.full_name
            FROM latest_decision decision
            WHERE header.id = decision.entity_id
              AND header.approved_by IS NULL
              AND decision.full_name IS NOT NULL
        $sql$;
    END IF;
END
$migration$;
