-- Mở rộng danh mục nhà cung cấp bằng các thông tin thường xuất hiện trên hóa đơn.
-- Quan hệ không đặt trong bảng vendors: assets.vendor_id và contracts.vendor_id
-- đã là khóa ngoại tới vendors.id, đúng với quan hệ một nhà cung cấp - nhiều bản ghi.

ALTER TABLE asset.vendors
    ADD COLUMN IF NOT EXISTS website VARCHAR(255),
    ADD COLUMN IF NOT EXISTS bank_name VARCHAR(180),
    ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(80);

COMMENT ON COLUMN asset.vendors.website IS 'Website công khai của nhà cung cấp trên hóa đơn';
COMMENT ON COLUMN asset.vendors.bank_name IS 'Tên ngân hàng nhận thanh toán';
COMMENT ON COLUMN asset.vendors.bank_account_number IS 'Số tài khoản nhận thanh toán';
