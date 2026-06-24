# Lược đồ chi tiết CSDL QLVT sau cải tiến

Tài liệu này mô tả lược đồ CSDL chi tiết sau khi áp dụng các đề xuất trong `de-xuat-cai-tien-schema-qlvt.md`.

Phạm vi chính là quản lý tài sản và công cụ dụng cụ. Các nghiệp vụ mua bán chỉ giữ ở mức tham chiếu khi cần, không đưa vào lõi quản lý tài sản.

## 1. Quy ước chung

### 1.1. Schema

Toàn bộ bảng nghiệp vụ QLVT đặt trong schema:

| Schema | Ý nghĩa |
| --- | --- |
| `asset` | Nhóm bảng quản lý tài sản, công cụ dụng cụ, danh mục, QR, tài liệu, điều chuyển, bảo trì |

### 1.2. Kiểu dữ liệu chuẩn

| Kiểu | Cách dùng |
| --- | --- |
| `bigint` | Khóa chính, khóa ngoại, id tham chiếu tới service khác |
| `varchar(n)` | Chuỗi ngắn có giới hạn độ dài |
| `text` | Nội dung dài, ít cần lọc chính xác |
| `numeric(18,2)` | Giá trị tiền tệ |
| `numeric(18,4)` | Số đo kỹ thuật cần độ chính xác cao hơn |
| `numeric(8,4)` | Tỷ lệ, ví dụ tỷ lệ khấu hao |
| `integer` | Số nguyên, năm, số tháng, số lượng |
| `boolean` | Cờ đúng/sai |
| `date` | Ngày nghiệp vụ |
| `timestamp` | Thời điểm phát sinh dữ liệu |

### 1.3. Enum nghiệp vụ

Các cột enum có thể triển khai bằng `varchar` trong giai đoạn đầu để linh hoạt, sau đó chuẩn hóa thành PostgreSQL enum hoặc lookup table nếu cần.

| Enum | Giá trị đề xuất | Ý nghĩa |
| --- | --- | --- |
| `asset_class` | `FIXED_ASSET` | Tài sản cố định |
| `asset_class` | `TOOL_EQUIPMENT` | Công cụ dụng cụ |
| `fixed_asset_type` | `TANGIBLE` | Tài sản cố định hữu hình |
| `fixed_asset_type` | `INTANGIBLE` | Tài sản cố định vô hình |
| `tool_usage_type` | `SINGLE_USE` | Công cụ dụng cụ dùng một lần |
| `tool_usage_type` | `MULTI_USE` | Công cụ dụng cụ dùng nhiều lần |
| `asset_status` | `IN_STOCK` | Đang trong kho |
| `asset_status` | `ASSIGNED` | Đã cấp phát/đang sử dụng |
| `asset_status` | `MAINTENANCE` | Đang bảo trì |
| `asset_status` | `LOST` | Mất/hỏng không còn kiểm soát |
| `asset_status` | `DISPOSED` | Đã thanh lý |
| `depreciation_method` | `STRAIGHT_LINE` | Khấu hao đường thẳng |
| `depreciation_method` | `DECLINING_BALANCE` | Khấu hao số dư giảm dần |
| `depreciation_method` | `NONE` | Không tính khấu hao |
| `catalog_type` | `ASSET` | Danh mục tài sản |
| `catalog_type` | `TOOL` | Danh mục công cụ dụng cụ |
| `catalog_type` | `MATERIAL` | Danh mục vật tư tham chiếu |
| `catalog_type` | `PRODUCT_REFERENCE` | Thành phẩm/vật tư thành phẩm tham chiếu |

## 2. Tổng quan quan hệ bảng

| Bảng | Vai trò |
| --- | --- |
| `asset.asset_categories` | Cây phân loại tài sản, thay thế `assets.category` dạng text tự do |
| `asset.asset_code_sequences` | Bộ đếm sinh mã tài sản theo từng phân loại |
| `asset.asset_catalog_items` | Danh mục gốc của tài sản, CCDC, vật tư/thành phẩm tham chiếu |
| `asset.assets` | Bảng lưu từng tài sản/CCDC thực tế |
| `asset.asset_value_snapshots` | Lịch sử giá trị tài sản theo kỳ |
| `asset.asset_documents` | Metadata file đính kèm, file vật lý lưu ở MinIO |
| `asset.asset_qr_codes` | Metadata QR, lịch sử in/thu hồi nếu cần |
| `asset.asset_transfers` | Lịch sử điều chuyển tài sản |
| `asset.maintenance_records` | Lịch sử bảo trì, sửa chữa, kiểm định |
| `asset.vendors` | Nhà cung cấp, đơn vị bảo trì, đơn vị cung cấp license |
| `asset.subscriptions` | Gói phần mềm/license/dịch vụ định kỳ, liên kết tài sản vô hình nếu có |

## 3. `asset.asset_categories`

### 3.1. Ý nghĩa

Bảng định nghĩa cây phân loại tài sản. Đây là bảng chuẩn hóa thay cho việc lưu `category` bằng chuỗi tự do trong bảng `assets`.

Ví dụ cây phân loại:

- `FIXED_ASSET`: Tài sản cố định
- `TANGIBLE`: Tài sản hữu hình
- `INTANGIBLE`: Tài sản vô hình
- `TOOL_EQUIPMENT`: Công cụ dụng cụ
- `TOOL_SINGLE_USE`: Công cụ dụng cụ dùng một lần
- `TOOL_MULTI_USE`: Công cụ dụng cụ dùng nhiều lần

### 3.2. Cột

| Cột | Kiểu dữ liệu | Bắt buộc | Mặc định | Khóa | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `bigint` | Có | generated | PK | Khóa chính |
| `code` | `varchar(60)` | Có |  | Unique | Mã phân loại, ví dụ `FIXED_ASSET`, `TANGIBLE` |
| `name` | `varchar(180)` | Có |  |  | Tên phân loại hiển thị |
| `parent_id` | `bigint` | Không |  | FK -> `asset_categories.id` | Nhóm cha trong cây phân loại |
| `asset_class` | `varchar(40)` | Có |  |  | Nhóm lớn: `FIXED_ASSET` hoặc `TOOL_EQUIPMENT` |
| `description` | `varchar(500)` | Không |  |  | Mô tả phân loại |
| `is_active` | `boolean` | Có | `true` |  | Còn sử dụng hay không |
| `created_at` | `timestamp` | Có | `now()` |  | Thời điểm tạo |
| `updated_at` | `timestamp` | Có | `now()` |  | Thời điểm cập nhật |

### 3.3. Ràng buộc đề xuất

| Ràng buộc | Nội dung |
| --- | --- |
| Unique | `code` |
| FK | `parent_id` tham chiếu `asset.asset_categories(id)` |
| Check | `asset_class in ('FIXED_ASSET', 'TOOL_EQUIPMENT')` |
| Index | `parent_id`, `asset_class`, `is_active` |

## 4. `asset.asset_code_sequences`

### 4.1. Ý nghĩa

Bảng lưu bộ đếm sinh mã tài sản theo từng phân loại. Mỗi `category_id` có một dòng sequence riêng, giúp backend cấp mã tăng dần theo nhóm tài sản/CCDC mà không phải scan bảng `asset.assets`.

Bảng này chỉ chứa dữ liệu vận hành phát sinh khi hệ thống bắt đầu sinh mã, không phải dữ liệu mẫu. Migration V3 chỉ tạo cấu trúc bảng rỗng.

### 4.2. Cột

| Cột | Kiểu dữ liệu | Bắt buộc | Mặc định | Khóa | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `category_id` | `bigint` | Có |  | PK, FK -> `asset_categories.id` | Phân loại sở hữu bộ đếm mã |
| `current_number` | `bigint` | Có | `0` |  | Số thứ tự hiện tại đã cấp trong phân loại |
| `created_at` | `timestamp` | Có | `now()` |  | Thời điểm tạo bộ đếm |
| `updated_at` | `timestamp` | Có | `now()` |  | Thời điểm cập nhật gần nhất |

### 4.3. Ràng buộc đề xuất

| Ràng buộc | Nội dung |
| --- | --- |
| PK | `category_id` |
| FK | `category_id` tham chiếu `asset.asset_categories(id)` |
| Check | `current_number >= 0` |

## 5. `asset.asset_catalog_items`

### 5.1. Ý nghĩa

Bảng lưu danh mục gốc lấy từ các file Excel như `Danh mục vật tư - CCDC.xls` và phần cần dùng của `Danh mục vật tư - Thành phẩm.xls`.

Bảng này không đại diện cho một tài sản thực tế đang được gán cho ai đó. Nó là master data để tạo tài sản thực tế nhanh hơn và thống nhất tên, đơn vị, giá trị tham chiếu.

### 5.2. Cột

| Cột | Kiểu dữ liệu | Bắt buộc | Mặc định | Khóa | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `bigint` | Có | generated | PK | Khóa chính |
| `item_code` | `varchar(80)` | Có |  | Unique | Mã danh mục/vật tư/CCDC từ Excel |
| `name` | `varchar(255)` | Có |  |  | Tên danh mục |
| `category_id` | `bigint` | Không |  | FK -> `asset_categories.id` | Nhóm tài sản/CCDC |
| `catalog_type` | `varchar(40)` | Có |  |  | Loại danh mục: `ASSET`, `TOOL`, `MATERIAL`, `PRODUCT_REFERENCE` |
| `inventory_group` | `varchar(120)` | Không |  |  | Phân loại tồn kho/phân nhóm sản phẩm từ Excel |
| `unit` | `varchar(40)` | Không |  |  | Đơn vị tính chính, ví dụ `CAI`, `BO`, `TAM`, `CUON` |
| `cost_value` | `numeric(18,2)` | Không |  |  | Đơn giá vốn/giá trị gốc tham chiếu |
| `standard_value` | `numeric(18,2)` | Không |  |  | Giá chuẩn nếu có |
| `fixed_value` | `numeric(18,2)` | Không |  |  | Giá cố định nếu có |
| `internal_value` | `numeric(18,2)` | Không |  |  | Giá nội bộ nếu có |
| `technical_spec` | `varchar(1000)` | Không |  |  | Thông số hoặc mô tả kỹ thuật ngắn |
| `is_active` | `boolean` | Có | `true` |  | Còn sử dụng hay không |
| `created_at` | `timestamp` | Có | `now()` |  | Thời điểm tạo |
| `updated_at` | `timestamp` | Có | `now()` |  | Thời điểm cập nhật |

### 5.3. Ràng buộc đề xuất

| Ràng buộc | Nội dung |
| --- | --- |
| Unique | `item_code` |
| FK | `category_id` tham chiếu `asset.asset_categories(id)` |
| Check | `catalog_type in ('ASSET', 'TOOL', 'MATERIAL', 'PRODUCT_REFERENCE')` |
| Index | `category_id`, `catalog_type`, `name`, `is_active` |

## 6. `asset.assets`

### 6.1. Ý nghĩa

Bảng trung tâm của hệ thống QLVT. Mỗi dòng là một tài sản hoặc công cụ dụng cụ thực tế cần quản lý.

Tài sản trong bảng này có thể:

- Gắn QR để tra cứu bằng điện thoại.
- Gán cho nhân viên, phòng ban, công trường, dự án.
- Điều chuyển, bảo trì, thanh lý.
- Theo dõi nguyên giá, khấu hao, giá trị sổ sách.
- Liên kết tài sản cha/con.

### 6.2. Cột

| Cột | Kiểu dữ liệu | Bắt buộc | Mặc định | Khóa | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `bigint` | Có | generated | PK | Khóa chính |
| `asset_code` | `varchar(80)` | Có |  | Unique | Mã tài sản thực tế, dùng trên tem/QR/báo cáo |
| `name` | `varchar(255)` | Có |  |  | Tên tài sản |
| `catalog_item_id` | `bigint` | Không |  | FK -> `asset_catalog_items.id` | Danh mục gốc nếu tạo từ danh mục |
| `category_id` | `bigint` | Có |  | FK -> `asset_categories.id` | Phân loại chuẩn |
| `parent_asset_id` | `bigint` | Không |  | FK -> `assets.id` | Tài sản cha nếu là tài sản con |
| `asset_class` | `varchar(40)` | Có |  |  | `FIXED_ASSET` hoặc `TOOL_EQUIPMENT` |
| `fixed_asset_type` | `varchar(40)` | Không |  |  | `TANGIBLE`, `INTANGIBLE`; chỉ dùng cho TSCĐ |
| `tool_usage_type` | `varchar(40)` | Không |  |  | `SINGLE_USE`, `MULTI_USE`; chỉ dùng cho CCDC |
| `serial_number` | `varchar(120)` | Không |  |  | Số serial/seri máy nếu có |
| `source` | `varchar(120)` | Không |  |  | Nguồn hình thành tài sản |
| `vendor_id` | `bigint` | Không |  | FK -> `vendors.id` | Nhà cung cấp/đơn vị liên quan |
| `assigned_employee_id` | `bigint` | Không |  | External FK | Nhân viên đang giữ/sử dụng, tham chiếu HRM |
| `department_id` | `bigint` | Không |  | External FK | Phòng ban sử dụng, tham chiếu HRM |
| `site_id` | `bigint` | Không |  | External FK | Công trường/địa điểm sử dụng |
| `project_id` | `bigint` | Không |  | External FK | Dự án liên quan, tham chiếu CDS/project-service |
| `purchase_date` | `date` | Không |  |  | Ngày mua hoặc ngày ghi nhận ban đầu |
| `use_date` | `date` | Không |  |  | Ngày đưa vào sử dụng |
| `depreciation_start_date` | `date` | Không |  |  | Ngày bắt đầu khấu hao |
| `warranty_until` | `date` | Không |  |  | Ngày hết bảo hành |
| `original_cost` | `numeric(18,2)` | Không |  |  | Nguyên giá tài sản |
| `purchase_cost` | `numeric(18,2)` | Không |  |  | Giá mua cũ để tương thích code hiện tại, nên chuyển dần sang `original_cost` |
| `accumulated_depreciation` | `numeric(18,2)` | Có | `0` |  | Khấu hao lũy kế |
| `book_value` | `numeric(18,2)` | Không |  |  | Giá trị theo sổ sách |
| `residual_value` | `numeric(18,2)` | Không |  |  | Giá trị còn lại/giá trị thu hồi dự kiến |
| `depreciation_method` | `varchar(40)` | Không | `STRAIGHT_LINE` |  | Phương pháp khấu hao |
| `useful_life_months` | `integer` | Không |  |  | Thời gian khấu hao theo tháng |
| `useful_life_years` | `integer` | Không |  |  | Trường cũ, giữ tạm để tương thích |
| `depreciation_rate` | `numeric(8,4)` | Không |  |  | Tỷ lệ khấu hao nếu có từ Excel |
| `manufacture_year` | `integer` | Không |  |  | Năm sản xuất |
| `installation_year` | `integer` | Không |  |  | Năm lắp đặt/cài đặt |
| `country_code` | `varchar(10)` | Không |  |  | Mã quốc gia/xuất xứ |
| `capacity` | `numeric(18,4)` | Không |  |  | Công suất thiết kế |
| `capacity_unit` | `varchar(40)` | Không |  |  | Đơn vị công suất |
| `real_capacity` | `numeric(18,4)` | Không |  |  | Công suất hiện dùng/thực tế |
| `technical_description` | `varchar(2000)` | Không |  |  | Mô tả kỹ thuật |
| `status` | `varchar(30)` | Có | `IN_STOCK` |  | Trạng thái tài sản |
| `disposal_date` | `date` | Không |  |  | Ngày thanh lý |
| `disposal_price` | `numeric(18,2)` | Không |  |  | Giá trị thanh lý |
| `disposal_reason` | `varchar(500)` | Không |  |  | Lý do thanh lý |
| `notes` | `varchar(1000)` | Không |  |  | Ghi chú |
| `created_at` | `timestamp` | Có | `now()` |  | Thời điểm tạo |
| `updated_at` | `timestamp` | Có | `now()` |  | Thời điểm cập nhật |

### 6.3. Ràng buộc đề xuất

| Ràng buộc | Nội dung |
| --- | --- |
| Unique | `asset_code` |
| FK | `catalog_item_id` tham chiếu `asset.asset_catalog_items(id)` |
| FK | `category_id` tham chiếu `asset.asset_categories(id)` |
| FK | `parent_asset_id` tham chiếu `asset.assets(id)` |
| FK | `vendor_id` tham chiếu `asset.vendors(id)` |
| Check | `asset_class in ('FIXED_ASSET', 'TOOL_EQUIPMENT')` |
| Check | Nếu `asset_class = 'FIXED_ASSET'` thì `fixed_asset_type` không nên null |
| Check | Nếu `asset_class = 'TOOL_EQUIPMENT'` thì `tool_usage_type` không nên null |
| Check | `original_cost >= 0`, `accumulated_depreciation >= 0`, `book_value >= 0` khi có giá trị |
| Index | `asset_code`, `name`, `category_id`, `asset_class`, `status`, `assigned_employee_id`, `department_id`, `site_id`, `project_id` |

### 6.4. Ghi chú migration

| Trường hiện tại | Hướng xử lý |
| --- | --- |
| `category` | Tạo `asset_categories`, map dữ liệu cũ sang `category_id`, sau đó bỏ hoặc giữ read-only tạm thời |
| `purchase_cost` | Copy sang `original_cost` nếu `original_cost` chưa có |
| `useful_life_years` | Chuyển sang `useful_life_months = useful_life_years * 12` |
| `residual_value` | Giữ lại, nhưng không dùng thay cho `book_value` |

## 7. `asset.asset_value_snapshots`

### 7.1. Ý nghĩa

Bảng lưu lịch sử giá trị tài sản theo từng thời điểm chốt. Bảng này giúp đối chiếu số liệu kế toán, import Excel theo kỳ, và truy vết biến động khấu hao.

### 7.2. Cột

| Cột | Kiểu dữ liệu | Bắt buộc | Mặc định | Khóa | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `bigint` | Có | generated | PK | Khóa chính |
| `asset_id` | `bigint` | Có |  | FK -> `assets.id` | Tài sản được chốt giá trị |
| `snapshot_date` | `date` | Có |  |  | Ngày chốt giá trị |
| `original_cost` | `numeric(18,2)` | Có |  |  | Nguyên giá tại thời điểm chốt |
| `period_depreciation` | `numeric(18,2)` | Có | `0` |  | Khấu hao phát sinh trong kỳ |
| `accumulated_depreciation` | `numeric(18,2)` | Có | `0` |  | Khấu hao lũy kế tới ngày chốt |
| `book_value` | `numeric(18,2)` | Có |  |  | Giá trị còn lại trên sổ |
| `source` | `varchar(80)` | Có | `SYSTEM_CALCULATION` |  | Nguồn số liệu: import, hệ thống tính, nhập tay |
| `notes` | `varchar(500)` | Không |  |  | Ghi chú |
| `created_at` | `timestamp` | Có | `now()` |  | Thời điểm tạo |

### 7.3. Ràng buộc đề xuất

| Ràng buộc | Nội dung |
| --- | --- |
| Unique | `(asset_id, snapshot_date, source)` |
| FK | `asset_id` tham chiếu `asset.assets(id)` |
| Check | Các giá trị tiền không âm |
| Index | `asset_id`, `snapshot_date`, `source` |

## 8. `asset.asset_documents`

### 8.1. Ý nghĩa

Bảng lưu metadata tài liệu đính kèm của tài sản. Tệp tin thực tế được lưu ở MinIO, database chỉ lưu `object_key` và thông tin phục vụ tra cứu.

### 8.2. Cột

| Cột | Kiểu dữ liệu | Bắt buộc | Mặc định | Khóa | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `bigint` | Có | generated | PK | Khóa chính |
| `asset_id` | `bigint` | Có |  | FK -> `assets.id` | Tài sản sở hữu tài liệu |
| `document_type` | `varchar(50)` | Có | `OTHER` |  | Loại tài liệu |
| `file_name` | `varchar(255)` | Có |  |  | Tên file gốc |
| `object_key` | `varchar(500)` | Có |  | Unique | Key object trong MinIO |
| `content_type` | `varchar(120)` | Không |  |  | MIME type |
| `size_bytes` | `bigint` | Không |  |  | Dung lượng file |
| `uploaded_by` | `varchar(200)` | Không |  |  | Người upload |
| `created_at` | `timestamp` | Có | `now()` |  | Thời điểm upload |

### 8.3. Ràng buộc đề xuất

| Ràng buộc | Nội dung |
| --- | --- |
| Unique | `object_key` |
| FK | `asset_id` tham chiếu `asset.assets(id)` |
| Check | `size_bytes >= 0` khi có giá trị |
| Index | `asset_id`, `document_type`, `created_at` |

## 9. `asset.asset_qr_codes`

### 9.1. Ý nghĩa

Bảng này không bắt buộc nếu QR chỉ sinh trực tiếp từ URL cố định của tài sản. Nên tạo bảng khi cần quản lý lịch sử in tem, thu hồi QR, token QR hoặc nhiều phiên bản QR cho cùng một tài sản.

### 9.2. Cột

| Cột | Kiểu dữ liệu | Bắt buộc | Mặc định | Khóa | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `bigint` | Có | generated | PK | Khóa chính |
| `asset_id` | `bigint` | Có |  | FK -> `assets.id` | Tài sản được gắn QR |
| `qr_payload` | `varchar(1000)` | Có |  |  | Nội dung QR, thường là URL chi tiết tài sản |
| `qr_token` | `varchar(120)` | Không |  | Unique | Token ẩn id nếu không muốn lộ `asset_id` trên URL |
| `status` | `varchar(30)` | Có | `ACTIVE` |  | Trạng thái QR |
| `printed_at` | `timestamp` | Không |  |  | Lần in gần nhất |
| `printed_by` | `varchar(200)` | Không |  |  | Người in gần nhất |
| `created_at` | `timestamp` | Có | `now()` |  | Thời điểm tạo QR metadata |

### 9.3. Ràng buộc đề xuất

| Ràng buộc | Nội dung |
| --- | --- |
| FK | `asset_id` tham chiếu `asset.assets(id)` |
| Unique | `qr_token` nếu dùng token |
| Check | `status in ('ACTIVE', 'REVOKED')` |
| Index | `asset_id`, `status`, `qr_token` |

## 10. `asset.asset_transfers`

### 10.1. Ý nghĩa

Bảng lưu lịch sử điều chuyển tài sản giữa nhân viên, phòng ban, công trường hoặc dự án. Đây là bảng lịch sử, không nên xóa khi tài sản đã chuyển nhiều lần.

### 10.2. Cột

| Cột | Kiểu dữ liệu | Bắt buộc | Mặc định | Khóa | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `bigint` | Có | generated | PK | Khóa chính |
| `asset_id` | `bigint` | Có |  | FK -> `assets.id` | Tài sản được điều chuyển |
| `transfer_type` | `varchar(30)` | Có |  |  | Loại điều chuyển |
| `transfer_date` | `date` | Có |  |  | Ngày điều chuyển |
| `from_employee_id` | `bigint` | Không |  | External FK | Nhân viên bàn giao |
| `to_employee_id` | `bigint` | Không |  | External FK | Nhân viên nhận |
| `from_department_id` | `bigint` | Không |  | External FK | Phòng ban bàn giao |
| `to_department_id` | `bigint` | Không |  | External FK | Phòng ban nhận |
| `from_site_id` | `bigint` | Không |  | External FK | Công trường/địa điểm cũ |
| `to_site_id` | `bigint` | Không |  | External FK | Công trường/địa điểm mới |
| `from_project_id` | `bigint` | Không |  | External FK | Dự án cũ nếu cần bổ sung |
| `to_project_id` | `bigint` | Không |  | External FK | Dự án mới nếu cần bổ sung |
| `condition_before` | `varchar(500)` | Không |  |  | Tình trạng trước khi bàn giao |
| `condition_after` | `varchar(500)` | Không |  |  | Tình trạng sau khi nhận |
| `reason` | `varchar(1000)` | Không |  |  | Lý do điều chuyển |
| `handover_document_url` | `varchar(500)` | Không |  |  | URL/key biên bản bàn giao, giữ tương thích hiện tại |
| `handover_document_id` | `bigint` | Không |  | FK -> `asset_documents.id` | Tài liệu bàn giao nếu dùng bảng document |
| `performed_by` | `varchar(200)` | Không |  |  | Người thực hiện |
| `approved_by` | `varchar(200)` | Không |  |  | Người duyệt |
| `created_at` | `timestamp` | Có | `now()` |  | Thời điểm tạo |

### 10.3. Ràng buộc đề xuất

| Ràng buộc | Nội dung |
| --- | --- |
| FK | `asset_id` tham chiếu `asset.assets(id)` |
| FK | `handover_document_id` tham chiếu `asset.asset_documents(id)` |
| Index | `asset_id`, `transfer_date`, `from_employee_id`, `to_employee_id`, `from_department_id`, `to_department_id` |

## 11. `asset.maintenance_records`

### 11.1. Ý nghĩa

Bảng lưu lịch sử bảo trì, sửa chữa, kiểm định tài sản. Dùng chủ yếu cho tài sản hữu hình như máy móc, thiết bị, xe, công cụ dùng nhiều lần.

### 11.2. Cột

| Cột | Kiểu dữ liệu | Bắt buộc | Mặc định | Khóa | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `bigint` | Có | generated | PK | Khóa chính |
| `asset_id` | `bigint` | Có |  | FK -> `assets.id` | Tài sản được bảo trì |
| `vendor_id` | `bigint` | Không |  | FK -> `vendors.id` | Đơn vị bảo trì/sửa chữa |
| `maintenance_type` | `varchar(30)` | Có |  |  | Loại bảo trì: định kỳ, sửa chữa, kiểm định |
| `maintenance_date` | `date` | Có |  |  | Ngày bảo trì |
| `next_maintenance_date` | `date` | Không |  |  | Ngày bảo trì tiếp theo |
| `performed_by` | `varchar(200)` | Không |  |  | Người/đơn vị thực hiện |
| `description` | `varchar(1000)` | Không |  |  | Nội dung bảo trì |
| `cost` | `numeric(18,2)` | Không |  |  | Chi phí bảo trì |
| `downtime_hours` | `numeric(10,2)` | Không |  |  | Thời gian dừng máy |
| `meter_reading` | `numeric(18,2)` | Không |  |  | Chỉ số giờ máy/km nếu có |
| `condition_after` | `varchar(500)` | Không |  |  | Tình trạng sau bảo trì |
| `status` | `varchar(30)` | Có |  |  | Trạng thái phiếu bảo trì |
| `created_at` | `timestamp` | Có | `now()` |  | Thời điểm tạo |
| `updated_at` | `timestamp` | Có | `now()` |  | Thời điểm cập nhật |

### 11.3. Ràng buộc đề xuất

| Ràng buộc | Nội dung |
| --- | --- |
| FK | `asset_id` tham chiếu `asset.assets(id)` |
| FK | `vendor_id` tham chiếu `asset.vendors(id)` |
| Check | `cost >= 0`, `downtime_hours >= 0`, `meter_reading >= 0` khi có giá trị |
| Index | `asset_id`, `maintenance_date`, `next_maintenance_date`, `status`, `vendor_id` |

## 12. `asset.vendors`

### 12.1. Ý nghĩa

Bảng lưu nhà cung cấp, đơn vị bảo trì, đơn vị cung cấp phần mềm/license. Bảng này đang có trong schema hiện tại và nên giữ.

### 12.2. Cột

| Cột | Kiểu dữ liệu | Bắt buộc | Mặc định | Khóa | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `bigint` | Có | generated | PK | Khóa chính |
| `name` | `varchar(180)` | Có |  |  | Tên nhà cung cấp/đơn vị |
| `tax_code` | `varchar(80)` | Không |  | Unique một phần | Mã số thuế nếu có |
| `contact_name` | `varchar(120)` | Không |  |  | Người liên hệ |
| `phone` | `varchar(40)` | Không |  |  | Số điện thoại |
| `email` | `varchar(120)` | Không |  |  | Email |
| `address` | `varchar(500)` | Không |  |  | Địa chỉ |
| `status` | `varchar(20)` | Có | `ACTIVE` |  | Trạng thái |
| `created_at` | `timestamp` | Có | `now()` |  | Thời điểm tạo |
| `updated_at` | `timestamp` | Có | `now()` |  | Thời điểm cập nhật |

### 12.3. Ràng buộc đề xuất

| Ràng buộc | Nội dung |
| --- | --- |
| Unique | `tax_code` nếu không null |
| Index | `name`, `status`, `tax_code` |

## 13. `asset.subscriptions`

### 13.1. Ý nghĩa

Bảng quản lý phần mềm, license hoặc dịch vụ định kỳ. Nếu license được xem là tài sản vô hình thì nên tạo một dòng tương ứng trong `asset.assets` với `asset_class = 'FIXED_ASSET'` và `fixed_asset_type = 'INTANGIBLE'`, sau đó liên kết qua `asset_id`.

### 13.2. Cột

| Cột | Kiểu dữ liệu | Bắt buộc | Mặc định | Khóa | Ý nghĩa |
| --- | --- | --- | --- | --- | --- |
| `id` | `bigint` | Có | generated | PK | Khóa chính |
| `asset_id` | `bigint` | Không |  | FK -> `assets.id` | Tài sản vô hình tương ứng |
| `vendor_id` | `bigint` | Không |  | FK -> `vendors.id` | Nhà cung cấp license/dịch vụ |
| `software_name` | `varchar(180)` | Có |  |  | Tên phần mềm/dịch vụ |
| `plan_name` | `varchar(120)` | Không |  |  | Tên gói |
| `license_key` | `varchar(500)` | Không |  |  | Key/license nếu được phép lưu |
| `owner_employee_id` | `bigint` | Không |  | External FK | Nhân viên phụ trách |
| `total_seats` | `integer` | Có | `0` |  | Tổng số seat/license |
| `used_seats` | `integer` | Có | `0` |  | Số seat/license đã dùng |
| `billing_cycle` | `varchar(20)` | Không |  |  | Chu kỳ thanh toán |
| `cost` | `numeric(18,2)` | Không |  |  | Chi phí mỗi kỳ hoặc chi phí ghi nhận |
| `start_date` | `date` | Không |  |  | Ngày bắt đầu |
| `renewal_date` | `date` | Không |  |  | Ngày gia hạn |
| `status` | `varchar(30)` | Có | `ACTIVE` |  | Trạng thái subscription |
| `notes` | `varchar(500)` | Không |  |  | Ghi chú |
| `created_at` | `timestamp` | Có | `now()` |  | Thời điểm tạo |
| `updated_at` | `timestamp` | Có | `now()` |  | Thời điểm cập nhật |

### 13.3. Ràng buộc đề xuất

| Ràng buộc | Nội dung |
| --- | --- |
| FK | `asset_id` tham chiếu `asset.assets(id)` |
| FK | `vendor_id` tham chiếu `asset.vendors(id)` |
| Check | `total_seats >= 0`, `used_seats >= 0`, `used_seats <= total_seats` |
| Check | `cost >= 0` khi có giá trị |
| Index | `asset_id`, `vendor_id`, `software_name`, `renewal_date`, `status` |

## 14. Bảng giữ sau, không thuộc lõi giai đoạn đầu

Các bảng hiện tại như `asset.purchase_requests` và `asset.contracts` có thể giữ nếu hệ thống vẫn cần quy trình mua sắm/hợp đồng. Tuy nhiên, theo phạm vi hiện tại là quản lý tài sản, hai bảng này không phải lõi schema cải tiến.

### 14.1. `asset.purchase_requests`

| Hướng xử lý | Ghi chú |
| --- | --- |
| Giữ nguyên nếu cần quy trình đề xuất mua sắm | Không bắt buộc cho chức năng quản lý tài sản/QR/kiểm kê |
| Không import các cột Excel liên quan mua hàng vào đây trong giai đoạn đầu | Tránh làm rộng phạm vi |

### 14.2. `asset.contracts`

| Hướng xử lý | Ghi chú |
| --- | --- |
| Giữ nguyên nếu cần quản lý hợp đồng mua/bảo trì | Có thể liên kết với `vendors`, `assets`, `asset_documents` sau |
| Không dùng thay thế `asset_documents` | Hợp đồng là nghiệp vụ riêng, còn tài liệu đính kèm tài sản nên có bảng riêng |

## 15. Gợi ý thứ tự tạo migration

1. Tạo `asset.asset_categories`.
2. Tạo `asset.asset_code_sequences`.
3. Tạo `asset.asset_catalog_items`.
4. Bổ sung cột mới vào `asset.assets`.
5. Map dữ liệu cũ từ `assets.category`, `purchase_cost`, `useful_life_years` nếu đang migrate từ DB có dữ liệu thật.
6. Tạo `asset.asset_value_snapshots`.
7. Tạo `asset.asset_documents`.
8. Tạo `asset.asset_qr_codes` nếu cần quản lý lịch sử in/thu hồi QR.
9. Bổ sung cột mới cho `asset.asset_transfers`, `asset.maintenance_records`, `asset.subscriptions`.
10. Sau khi API/frontend đã chuyển sang field mới, cân nhắc bỏ field cũ `category`, `purchase_cost`, `useful_life_years`.

## 16. Ghi chú triển khai API/frontend

| Khu vực | Thay đổi cần làm |
| --- | --- |
| API tạo/sửa tài sản | Nhận thêm `categoryId`, `assetClass`, `fixedAssetType`, `toolUsageType`, `originalCost`, `bookValue`, `useDate`, `depreciationStartDate` |
| API danh mục | Thêm CRUD/import cho `asset_categories` và `asset_catalog_items` |
| API sinh mã tài sản | Dùng `asset_code_sequences` để cấp mã tăng dần theo `category_id` trong transaction |
| API QR | Sinh QR từ URL ổn định hoặc token; chỉ lưu `asset_qr_codes` nếu cần lịch sử |
| API file | Upload file vào MinIO, lưu metadata vào `asset_documents` |
| Frontend tài sản | Form cần tách rõ TSCĐ/CCDC, hữu hình/vô hình, dùng một lần/dùng nhiều lần |
| Frontend báo cáo | Dùng `asset_value_snapshots` nếu cần báo cáo theo kỳ |

## 17. Kết luận

Lược đồ sau cải tiến tách rõ 3 lớp dữ liệu:

1. Phân loại và danh mục chuẩn.
2. Tài sản/CCDC thực tế.
3. Lịch sử, tài liệu, QR, điều chuyển, bảo trì.

Cách tách này giúp hệ thống QLVT quản lý đúng nghiệp vụ tài sản, đồng thời vẫn đủ linh hoạt để import dữ liệu từ Excel, xuất tem QR, kiểm kê, điều chuyển, bảo trì, thanh lý và báo cáo giá trị tài sản.
