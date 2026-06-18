# Đề xuất cải tiến schema CSDL QLVT - Tính khấu hao tài sản

## 1. Phạm vi nghiệp vụ

Hệ thống QLVT hiện tại nên tập trung vào quản lý tài sản và công cụ dụng cụ.

Phân loại tài sản cần hỗ trợ:

- Tài sản cố định
  - Tài sản hữu hình: máy móc, xe, khuôn, thiết bị, nhà xưởng, vật kiến trúc.
  - Tài sản vô hình: bản quyền phần mềm, license, quyền sử dụng, gói dịch vụ dài hạn.
- Công cụ dụng cụ
  - Dùng một lần.
  - Dùng nhiều lần.

Dữ liệu trong 3 file Excel cần tham chiếu:

- `Hồ sơ tài sản.xls`: danh sách tài sản thực tế, mã tài sản, tên tài sản, loại tài sản, nhóm TSCĐ, bộ phận sử dụng, ngày sử dụng, ngày bắt đầu khấu hao, nguyên giá, khấu hao, giá trị theo sổ sách, năm sản xuất, công suất, mô tả kỹ thuật.
- `Danh mục vật tư - CCDC.xls`: danh mục công cụ dụng cụ, mã, tên, nhóm, đơn vị, giá vốn/giá chuẩn/giá nội bộ, thông tin tồn kho.
- `Danh mục vật tư - Thành phẩm.xls`: danh mục thành phẩm/vật tư tham chiếu, mã, tên, nhóm, đơn vị, giá trị, thông tin tồn kho. Nếu QLVT chỉ quản lý tài sản thì chỉ nên lấy phần danh mục/giá trị cần liên kết, bỏ phần bán hàng.

## 2. Vấn đề của schema hiện tại

Bảng `asset.assets` hiện tại đã có các trường cơ bản:

- Mã tài sản, tên tài sản, category, serial.
- Nguồn, nhà cung cấp.
- Nhân viên/phòng ban/công trường/dự án đang sử dụng.
- Giá mua, giá trị còn lại.
- Ngày mua, bảo hành.
- Trạng thái, phương pháp khấu hao, thời gian sử dụng.
- Thanh lý.

Nhưng schema hiện tại còn thiếu các điểm quan trọng:

- `category` đang là chuỗi tự do, chưa biểu diễn được cây phân loại: TSCĐ/CCDC, hữu hình/vô hình, dùng một lần/dùng nhiều lần.
- Chưa tách danh mục tài sản/vật tư với tài sản thực tế.
- Chưa có tài sản cha/con để quản lý cụm máy, bộ thiết bị, hạng mục lớn.
- Chưa lưu rõ `nguyên giá`, `khấu hao lũy kế`, `giá trị theo sổ sách`.
- Khấu hao mới có `usefulLifeYears`, chưa đủ nếu Excel quản lý theo năm/tháng, ngày bắt đầu khấu hao, tỷ lệ khấu hao.
- Chưa có các thông tin kỹ thuật như năm sản xuất, năm lắp đặt, công suất, đơn vị công suất, mô tả kỹ thuật.
- Chưa có bảng lưu lịch sử giá trị/khấu hao theo kỳ, nếu sau này cần đối chiếu tài chính.

## 3. Hướng cải tiến

Nên cải tiến theo 2 lớp dữ liệu:

1. Danh mục: lưu master data của tài sản/vật tư/CCDC.
2. Tài sản thực tế: lưu từng tài sản cụ thể đang quản lý, có gán người dùng/phòng ban/dự án/công trường.

Không nên đưa toàn bộ cột Excel vào CSDL. Các cột liên quan bán hàng, TMĐT, thuế bán ra, nhóm thị trường, quy trình công nghệ, đặt hàng/mua hàng có thể bỏ qua trong giai đoạn này.

## 4. Schema gợi ý

### 4.1. `asset.asset_categories`

Bảng định nghĩa cây phân loại tài sản.

Ý nghĩa:

- Chuẩn hóa phân loại thay vì dùng `assets.category` dạng text tự do.
- Hỗ trợ cấu trúc cha/con: TSCĐ -> hữu hình/vô hình, CCDC -> dùng một lần/dùng nhiều lần.

Cột gợi ý:

| Cột | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `id` | bigint | Khóa chính |
| `code` | varchar(60) | Mã nhóm, ví dụ `FIXED_ASSET`, `TANGIBLE`, `TOOL_MULTI_USE` |
| `name` | varchar(180) | Tên nhóm |
| `parent_id` | bigint | Nhóm cha |
| `asset_class` | varchar(40) | `FIXED_ASSET` hoặc `TOOL_EQUIPMENT` |
| `description` | varchar(500) | Mô tả |
| `active` | boolean | Còn sử dụng hay không |
| `created_at` | timestamp | Ngày tạo |
| `updated_at` | timestamp | Ngày cập nhật |

### 4.2. `asset.asset_catalog_items`

Bảng danh mục tài sản/vật tư/CCDC lấy từ các file danh mục.

Ý nghĩa:

- Lưu master data: mã, tên, đơn vị, nhóm, giá trị tham chiếu.
- Dùng để tạo nhanh tài sản thực tế từ danh mục.
- Phù hợp với file `Danh mục vật tư - CCDC.xls` và một phần cần dùng của `Danh mục vật tư - Thành phẩm.xls`.

Cột gợi ý:

| Cột | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `id` | bigint | Khóa chính |
| `item_code` | varchar(80) | Mã danh mục/vật tư |
| `name` | varchar(255) | Tên danh mục |
| `category_id` | bigint | Nhóm tài sản/CCDC |
| `catalog_type` | varchar(40) | `ASSET`, `TOOL`, `MATERIAL`, `PRODUCT_REFERENCE` |
| `inventory_group` | varchar(120) | Phân loại tồn kho/phân nhóm SP |
| `unit` | varchar(40) | Đơn vị tính chính |
| `cost_value` | numeric(18,2) | Đơn giá vốn/giá trị gốc tham chiếu |
| `standard_value` | numeric(18,2) | Giá chuẩn nếu có |
| `fixed_value` | numeric(18,2) | Giá cố định nếu có |
| `internal_value` | numeric(18,2) | Giá nội bộ nếu có |
| `technical_spec` | varchar(1000) | Thông số/mô tả ngắn |
| `active` | boolean | Còn sử dụng hay không |
| `created_at` | timestamp | Ngày tạo |
| `updated_at` | timestamp | Ngày cập nhật |

### 4.3. `asset.assets`

Bảng tài sản thực tế đang quản lý.

Ý nghĩa:

- Mỗi dòng là một tài sản/CCDC cụ thể có thể gán QR, gán người sử dụng, điều chuyển, bảo trì, thanh lý.
- Đây là bảng trung tâm của QLVT.

Cột hiện tại nên giữ:

- `id`, `asset_code`, `name`, `serial_number`.
- `vendor_id`, `assigned_employee_id`, `department_id`, `site_id`, `project_id`.
- `status`, `warranty_until`, `notes`, `created_at`, `updated_at`.
- `disposal_date`, `disposal_price`, `disposal_reason`.

Cột nên thêm/sửa:

| Cột | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `catalog_item_id` | bigint | Liên kết danh mục gốc nếu tài sản được tạo từ danh mục |
| `category_id` | bigint | Liên kết `asset_categories`, thay cho category text |
| `parent_asset_id` | bigint | Tài sản cha nếu là tài sản con |
| `asset_class` | varchar(40) | `FIXED_ASSET` hoặc `TOOL_EQUIPMENT` |
| `fixed_asset_type` | varchar(40) | `TANGIBLE`, `INTANGIBLE`, null nếu không phải TSCĐ |
| `tool_usage_type` | varchar(40) | `SINGLE_USE`, `MULTI_USE`, null nếu không phải CCDC |
| `source` | varchar(120) | Nguồn hình thành |
| `use_date` | date | Ngày đưa vào sử dụng |
| `depreciation_start_date` | date | Ngày bắt đầu khấu hao |
| `original_cost` | numeric(18,2) | Nguyên giá |
| `accumulated_depreciation` | numeric(18,2) | Khấu hao lũy kế |
| `book_value` | numeric(18,2) | Giá trị theo sổ sách |
| `residual_value` | numeric(18,2) | Giá trị thu hồi/còn lại dự kiến |
| `depreciation_method` | varchar(40) | Ví dụ `STRAIGHT_LINE`, `DECLINING_BALANCE`, `NONE` |
| `useful_life_months` | integer | Thời gian khấu hao theo tháng |
| `depreciation_rate` | numeric(8,4) | Tỷ lệ khấu hao nếu có |
| `manufacture_year` | integer | Năm sản xuất |
| `installation_year` | integer | Năm lắp đặt/cài đặt |
| `country_code` | varchar(10) | Quốc gia xuất xứ |
| `capacity` | numeric(18,4) | Công suất |
| `capacity_unit` | varchar(40) | Đơn vị công suất |
| `real_capacity` | numeric(18,4) | Công suất hiện dùng/thực tế |
| `technical_description` | varchar(2000) | Mô tả kỹ thuật |

Ghi chú:

- Có thể giữ `purchase_cost` tạm thời để tương thích code cũ, nhưng nên chuyển dần sang `original_cost`.
- `book_value` có thể tính từ `original_cost - accumulated_depreciation`, nhưng nên lưu snapshot nếu cần đối chiếu số liệu kế toán/import Excel.

### 4.4. `asset.asset_value_snapshots`

Bảng lưu lịch sử giá trị tài sản theo kỳ.

Ý nghĩa:

- Lưu giá trị tài sản tại một thời điểm: nguyên giá, khấu hao lũy kế, giá trị sổ sách.
- Cần thiết nếu muốn đối chiếu với Excel/kế toán theo tháng, quý, năm.
- Nếu giai đoạn đầu chưa làm tài chính chi tiết thì có thể làm sau.

Cột gợi ý:

| Cột | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `id` | bigint | Khóa chính |
| `asset_id` | bigint | Tài sản |
| `snapshot_date` | date | Ngày chốt giá trị |
| `original_cost` | numeric(18,2) | Nguyên giá tại thời điểm chốt |
| `period_depreciation` | numeric(18,2) | Khấu hao kỳ này |
| `accumulated_depreciation` | numeric(18,2) | Khấu hao lũy kế |
| `book_value` | numeric(18,2) | Giá trị còn lại trên sổ |
| `source` | varchar(80) | `IMPORT`, `SYSTEM_CALCULATION`, `MANUAL_ADJUSTMENT` |
| `notes` | varchar(500) | Ghi chú |
| `created_at` | timestamp | Ngày tạo |

### 4.5. `asset.asset_documents`

Bảng tài liệu đính kèm của tài sản.

Ý nghĩa:

- Lưu file hóa đơn, biên bản bàn giao, hình ảnh, phiếu bảo trì, chứng từ thanh lý.
- MinIO nên chỉ lưu file object; DB lưu metadata và object key.

Cột gợi ý:

| Cột | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `id` | bigint | Khóa chính |
| `asset_id` | bigint | Tài sản |
| `document_type` | varchar(50) | `IMAGE`, `HANDOVER`, `INVOICE`, `WARRANTY`, `MAINTENANCE`, `DISPOSAL`, `OTHER` |
| `file_name` | varchar(255) | Tên file gốc |
| `object_key` | varchar(500) | Key file trong MinIO |
| `content_type` | varchar(120) | MIME type |
| `size_bytes` | bigint | Dung lượng |
| `uploaded_by` | varchar(200) | Người upload |
| `created_at` | timestamp | Ngày upload |

### 4.6. `asset.asset_qr_codes`

Bảng QR code của tài sản.

Ý nghĩa:

- QR có thể sinh từ URL cố định, không bắt buộc lưu ảnh QR.
- Chỉ cần bảng này nếu muốn quản lý lịch sử in tem, version QR, token truy cập, hoặc thu hồi QR.

Cột gợi ý:

| Cột | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `id` | bigint | Khóa chính |
| `asset_id` | bigint | Tài sản |
| `qr_payload` | varchar(1000) | Nội dung QR, thường là URL chi tiết tài sản |
| `qr_token` | varchar(120) | Token public/opaque nếu không muốn lộ asset id |
| `status` | varchar(30) | `ACTIVE`, `REVOKED` |
| `printed_at` | timestamp | Lần in gần nhất |
| `printed_by` | varchar(200) | Người in |
| `created_at` | timestamp | Ngày tạo |

Ghi chú:

- Nếu QR chỉ là URL dạng `/assets/{id}` thì mỗi lần xuất QR sẽ giống nhau.
- Không cần lưu ảnh QR vào MinIO trong giai đoạn đầu.

### 4.7. `asset.asset_transfers`

Bảng hiện tại đã có và nên giữ.

Ý nghĩa:

- Lưu lịch sử điều chuyển tài sản giữa nhân viên, phòng ban, công trường.
- Phục vụ truy vết ai đang giữ, ai bàn giao, lý do điều chuyển.

Nên cân nhắc bổ sung:

| Cột | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `condition_before` | varchar(500) | Tình trạng trước khi bàn giao |
| `condition_after` | varchar(500) | Tình trạng sau khi nhận |
| `approved_by` | varchar(200) | Người duyệt |

### 4.8. `asset.maintenance_records`

Bảng hiện tại đã có và nên giữ.

Ý nghĩa:

- Lưu lịch sử bảo trì, sửa chữa, kiểm định.
- Phù hợp với tài sản hữu hình, máy móc, xe, thiết bị.

Nên cân nhắc bổ sung:

| Cột | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `downtime_hours` | numeric(10,2) | Thời gian dừng máy |
| `condition_after` | varchar(500) | Tình trạng sau bảo trì |
| `meter_reading` | numeric(18,2) | Chỉ số giờ máy/km nếu có |

### 4.9. `asset.vendors`

Bảng hiện tại đã có và nên giữ.

Ý nghĩa:

- Lưu nhà cung cấp, nhà bảo trì, đơn vị bán phần mềm/license.
- Có thể liên kết với tài sản, hợp đồng, bảo trì.

Không cần mở rộng nhiều trong giai đoạn đầu.

### 4.10. `asset.subscriptions`

Bảng hiện tại phù hợp với tài sản vô hình dạng subscription/license.

Ý nghĩa:

- Quản lý license phần mềm, gói dịch vụ, số seat, ngày gia hạn.
- Nên liên kết với `assets` nếu coi license là một tài sản vô hình có mã QR/mã tài sản.

Cột nên thêm:

| Cột | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `asset_id` | bigint | Tài sản vô hình tương ứng |
| `license_key` | varchar(500) | Key/license nếu được phép lưu |
| `owner_employee_id` | bigint | Nhân viên/phòng ban quản lý license |

## 5. Bảng có thể giảm ưu tiên

Nếu QLVT giai đoạn này chỉ quản lý tài sản, các bảng/chức năng sau có thể để sau:

- `purchase_requests`: liên quan đề xuất mua sắm.
- `contracts`: liên quan hợp đồng mua/bảo trì, có ích nhưng không phải lõi tài sản.
- Các cột Excel về bán hàng, TMĐT, VAT bán ra, nhóm thị trường, giá bán sàn.

## 6. Thứ tự triển khai đề xuất

1. Thêm enum/lookup cho phân loại tài sản: TSCĐ/CCDC, hữu hình/vô hình, dùng một lần/dùng nhiều lần.
2. Sửa `assets` để thêm `category_id`, `parent_asset_id`, `original_cost`, `accumulated_depreciation`, `book_value`, `use_date`, `depreciation_start_date`, `useful_life_months`.
3. Tạo `asset_catalog_items` để import danh mục CCDC/thành phẩm.
4. Tạo API/import Excel mapping danh mục vào `asset_catalog_items`.
5. Tạo `asset_value_snapshots` nếu cần chốt giá trị tài sản theo kỳ.
6. Tạo `asset_documents` và tích hợp MinIO cho file đính kèm.
7. Thêm QR route và có thể thêm `asset_qr_codes` nếu cần quản lý lịch sử in/thu hồi QR.

## 7. Kết luận

Schema hiện tại đủ để quản lý tài sản mức cơ bản, nhưng nên cải tiến trước khi import/vận hành dữ liệu thực tế từ Excel.

Thay đổi quan trọng nhất là:

- Chuẩn hóa phân loại tài sản.
- Tách danh mục với tài sản thực tế.
- Lưu đầy đủ giá trị tài sản: nguyên giá, khấu hao, giá trị sổ sách.
- Hỗ trợ tài sản cha/con.
- Bổ sung thông tin kỹ thuật và ngày khấu hao.

Đây là nền tảng cần thiết để sau này làm QR, in tem, kiểm kê, điều chuyển, bảo trì, thanh lý và báo cáo giá trị tài sản.
