-- Hibernate generated these constraints before the canonical Flyway constraints existed.
-- Their default RESTRICT action overrides the intended ON DELETE behavior.
ALTER TABLE asset.asset_transfers
    DROP CONSTRAINT IF EXISTS fkdwv2g7tatmkpsotvlgqa5yi1y;

ALTER TABLE asset.maintenance_records
    DROP CONSTRAINT IF EXISTS fk124fjg43i0s5luwopsoq78k9h;
