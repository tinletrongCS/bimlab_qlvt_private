ALTER TABLE asset.assets
    ADD COLUMN IF NOT EXISTS contract_number VARCHAR(120),
    ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(120);

COMMENT ON COLUMN asset.assets.contract_number IS 'Mã hợp đồng nguồn tại thời điểm nhập tài sản';
COMMENT ON COLUMN asset.assets.invoice_number IS 'Số hóa đơn nguồn tại thời điểm nhập tài sản';
