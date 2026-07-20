# Luồng bàn giao tài sản - V7

## Các thay đổi nền tảng trong V7

Migration `V7__expand_asset_transfer_workflow.sql` mở rộng nghiệp vụ bàn giao theo hướng có phiếu, có nhiều tài sản trong một phiếu, có biên bản và có xác nhận nhiều người.

### Bảng mới

`asset.asset_transfer_headers`

- Là phiếu bàn giao/header.
- Một phiếu có thể gồm nhiều tài sản.
- Quản lý trạng thái phiếu chính: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `CANCELLED`.
- Lưu thông tin nơi giao/nhận ở các cấp: nhân sự, phòng ban, chi nhánh/site, dự án.

`asset.asset_transfer_documents`

- Lưu metadata file/biên bản của phiếu bàn giao.
- File vật lý nằm trên MinIO, bảng này chỉ lưu `object_key`, `file_name`, `content_type`, `size_bytes`.
- Document gắn với phiếu qua `transfer_header_id`, không gắn riêng từng dòng tài sản.

`asset.asset_transfer_confirmations`

- Lưu các bước xác nhận/ký của phiếu.
- Mỗi dòng là một vai trò cần xác nhận, ví dụ: `HANDOVER`, `RECEIVER`, `MANAGER`, `WAREHOUSE`, `ACCOUNTING`, `ADMIN`.
- Đây không phải cơ chế voting. Ai có đúng quyền/vai trò thì được xác nhận bước của mình.

### Bảng cũ được mở rộng

`asset.asset_transfers`

- Giữ lại để tương thích code cũ.
- Theo thiết kế mới, bảng này đóng vai trò là dòng chi tiết tài sản trong phiếu.
- Thêm `transfer_header_id` để liên kết về `asset_transfer_headers`.
- Thêm `line_status`, `status_before`, `status_after`, `book_value_at_transfer`, `receiver_note`.

Lưu ý: các cột cũ `handover_document_url`, `handover_document_id` trong `asset_transfers` được xem là legacy. Backend mới nên dùng `asset_transfer_documents`.

## Quy ước audit log

Bang `asset.audit_logs` đã có từ V6. Backend đã có `AuditLogService` để ghi log và `AuditLogController` để đọc log theo entity.

V8 bổ sung `asset.audit_log_definitions` để lưu metadata danh mục log cho admin/UI. Bảng này không có khóa ngoại từ `audit_logs`, vì audit log phải ghi được kể cả khi metadata chưa được khai báo.

### Quy ước JSON trong audit log

`before_data`

- Snapshot trước thao tác.
- Là object JSON, key là tên field nghiệp vụ.
- Ví dụ:

```json
{
  "assignedEmployeeId": 1,
  "departmentId": 10,
  "status": "ASSIGNED"
}
```

`after_data`

- Snapshot sau thao tác.
- Cùng cấu trúc key với `before_data`.
- Ví dụ:

```json
{
  "assignedEmployeeId": 2,
  "departmentId": 20,
  "status": "ASSIGNED"
}
```

`changed_fields`

- Chỉ chứa các field có thay đổi.
- Mỗi field có dạng:

```json
{
  "fieldName": {
    "before": "giá trị cũ",
    "after": "giá trị mới"
  }
}
```

Ví dụ:

```json
{
  "assignedEmployeeId": {
    "before": 1,
    "after": 2
  },
  "departmentId": {
    "before": 10,
    "after": 20
  }
}
```

DB không ép schema JSONB bằng constraint để audit linh hoạt cho nghiệp vụ mới. Backend nên giữ quy ước trên khi ghi log.

### Bảng đề xuất `entity_type`

| Entity type | Ý nghĩa | Entity id | Khi dùng |
| --- | --- | --- | --- |
| `ASSET` | Một tài sản cụ thể | `asset.assets.id` | Xem lịch sử của từng tài sản: tạo, sửa, bàn giao, thu hồi, thanh lý, bảo trì |
| `ASSET_TRANSFER_HEADER` | Một phiếu bàn giao | `asset.asset_transfer_headers.id` | Xem vòng đời phiếu: tạo, gửi duyệt, duyệt, từ chối, hủy |
| `ASSET_TRANSFER` | Một dòng tài sản trong phiếu hoặc bản ghi transfer legacy | `asset.asset_transfers.id` | Truy vết dòng bàn giao riêng lẻ, tương thích code cũ |
| `ASSET_CATEGORY` | Một danh mục tài sản | `asset.asset_categories.id` | Thêm/sửa/xóa/import danh mục |
| `ASSET_BOOKING` | Một phiên đặt phòng/tài sản | `asset.asset_booking_sessions.id` | Tạo, xác nhận, check-in, check-out, hủy booking |
| `VENDOR` | Một nhà cung cấp | `asset.vendors.id` | Thêm/sửa/xóa nhà cung cấp |
| `CONTRACT` | Một hợp đồng | `asset.contracts.id` | Tạo, cập nhật, hết hạn, đính kèm tài liệu |
| `MAINTENANCE_RECORD` | Một phiếu/bản ghi bảo trì | `asset.maintenance_records.id` | Tạo, cập nhật, hoàn tất bảo trì |
| `PURCHASE_REQUEST` | Một đề xuất mua sắm | `asset.purchase_requests.id` | Tạo, duyệt, từ chối đề xuất |
| `SUBSCRIPTION` | Một license/thuê bao phần mềm | `asset.subscriptions.id` | Gia hạn, đổi trạng thái, cập nhật license |

### Log lịch sử từng tài sản

Mỗi tài sản bị bàn giao nên có log riêng:

- `module = ASSET_TRANSFER`
- `entity_type = ASSET`
- `entity_id = assets.id`
- `entity_code = assets.asset_code`
- `action = TRANSFER_CREATED`, `TRANSFER_SUBMITTED`, `TRANSFER_APPROVED`, `TRANSFER_REJECTED`, `TRANSFER_CANCELLED`, ...

Cách xem lịch sử một tài sản:

```sql
SELECT *
FROM asset.audit_logs
WHERE entity_type = 'ASSET'
  AND entity_id = :assetId
ORDER BY occurred_at DESC;
```

Endpoint backend:

```text
GET /api/asset/audit-logs/assets/{assetId}
```

Hoặc truy vấn tổng quát:

```text
GET /api/asset/audit-logs?entityType=ASSET&entityId={assetId}
```

### Log vòng đời phiếu

Nên ghi thêm log cho phiếu để xem lịch sử xử lý:

- `module = ASSET_TRANSFER`
- `entity_type = ASSET_TRANSFER_HEADER`
- `entity_id = asset_transfer_headers.id`
- `entity_code = asset_transfer_headers.transfer_code`

Log theo phiếu giúp trả lời: ai tạo phiếu, ai gửi duyệt, ai duyệt/từ chối, ai hủy, lý do gì.

## Luồng bàn giao tài sản

Chọn chức năng `Tài sản` > `Bàn giao`.

Trạng thái chính:

```text
DRAFT -> PENDING_APPROVAL -> APPROVED / REJECTED
```
*NHÁP -> CHỜ XÉT DUYỆT -> ĐÃ DUYỆT/TỪ CHỐI*

```text
DRAFT hoặc PENDING_APPROVAL -> CANCELLED
```
*NHÁP -> CHỜ XÉT DUYỆT -> HỦY PHIẾU (trước khi được duyệt/từ chối)*


### 1. Tạo phiếu bàn giao tài sản

Người dùng bấm **Tạo phiếu bàn giao**. Phiếu mới có trạng thái `DRAFT`.

Form tạo phiếu gồm các nhóm thông tin:

- **Thông tin chung**: mã phiếu, tiêu đề, loại bàn giao, lý do bàn giao, thời gian bàn giao dự kiến, ghi chú.
- **Bên bàn giao**: chi nhánh/site, phòng ban, nhân sự hoặc đơn vị đang quản lý tài sản.
- **Bên tiếp nhận**: chi nhánh/site, phòng ban, nhân sự hoặc đơn vị nhận tài sản.
- **Danh sách tài sản**: chọn một hoặc nhiều tài sản cần bàn giao.
- **Tình trạng trước bàn giao**: trạng thái hiện tại, tình trạng thực tế, vị trí hiện tại, giá trị còn lại nếu cần quản lý tài chính.
- **Thành phần liên quan**: người chịu trách nhiệm bàn giao, người nhận bàn giao, người tạo phiếu, người duyệt nếu cần hiển thị trước.
- **Tệp đính kèm**: biên bản, hình ảnh, file kiểm kê, tài liệu liên quan.

Backend khi lưu nháp:

- Tạo một dòng `asset_transfer_headers` với `status = DRAFT`.
- Tạo các dòng `asset_transfers` tương ứng từng tài sản, liên kết bằng `transfer_header_id`.
- Snapshot dữ liệu quan trọng của từng tài sản vào dòng chi tiết:
  - `status_before`
  - `condition_before`
  - `book_value_at_transfer`
  - thông tin vị trí/người giữ hiện tại nếu backend DTO có hỗ trợ.
- Chưa cập nhật dữ liệu thật trong `asset.assets`.

Audit:

- Log phiếu: `TRANSFER_DRAFT_CREATED`, `entity_type = ASSET_TRANSFER_HEADER`.
- Có thể log từng tài sản: `TRANSFER_LINE_ADDED`, `entity_type = ASSET`.

### 2. Gửi phiếu duyệt

Khi nhập đủ thông tin bắt buộc, người tạo bấm **Gửi phiếu**.

Backend:

- Validate phiếu có ít nhất một tài sản.
- Validate các thông tin bắt buộc: bên giao, bên nhận, lý do, thời gian bàn giao dự kiến.
- Đổi phiếu: `DRAFT -> PENDING_APPROVAL`.
- Khóa chỉnh sửa các trường nghiệp vụ chính, trừ ghi chú hoặc tệp đính kèm nếu hệ thống cho phép.
- Không cập nhật `asset.assets`.

Audit:

- Log phiếu: `TRANSFER_SUBMITTED`.

### 3. Duyệt hoặc từ chối phiếu

Người có quyền `asset_transfers_approve` vào chi tiết phiếu đang `PENDING_APPROVAL` và chọn **Duyệt** hoặc **Từ chối**.

Nếu duyệt:

- Đổi phiếu: `PENDING_APPROVAL -> APPROVED`.
- Đổi từng dòng `asset_transfers.line_status = APPROVED`.
- Cập nhật từng tài sản trong `asset.assets`:
  - `assigned_employee_id`
  - `department_id`
  - `site_id`
  - `project_id`
  - `status`
- Ghi snapshot trước/sau vào `before_data`, `after_data`, `changed_fields`.

Audit khi duyệt:

- 1 log phiếu: `TRANSFER_APPROVED`, `entity_type = ASSET_TRANSFER_HEADER`.
- 1 log riêng cho mỗi tài sản: `TRANSFER_APPROVED`, `entity_type = ASSET`.

Nếu từ chối:

- Đổi phiếu: `PENDING_APPROVAL -> REJECTED`.
- Đổi từng dòng `asset_transfers.line_status = REJECTED`.
- Bắt buộc nhập lý do từ chối.
- Không cập nhật `asset.assets`.

Audit khi từ chối:

- Log phiếu: `TRANSFER_REJECTED`.
- Có thể log từng tài sản `TRANSFER_REJECTED` nếu muốn lịch sử tài sản thể hiện việc từng được đưa vào phiếu bị từ chối.

### 4. Biên bản và file đính kèm

File biên bản, file scan chữ ký, hình ảnh bàn giao được upload lên MinIO.

Backend tạo dòng:

```text
asset_transfer_documents.transfer_header_id = id phiếu
asset_transfer_documents.document_type = HANDOVER_MINUTES / SIGNED_MINUTES / IMAGE / ATTACHMENT
```

Audit:

- Log phiếu: `TRANSFER_DOCUMENT_ADDED`.

### 5. Hủy phiếu

Chỉ cho hủy khi phiếu đang `DRAFT` hoặc `PENDING_APPROVAL`.

Backend:

- Đổi phiếu sang `CANCELLED`.
- Ghi `cancel_reason`, `cancelled_by`, `cancelled_at`.
- Không cập nhật `asset.assets`.

Audit:

- Log phiếu: `TRANSFER_CANCELLED`.
- Có thể log từng tài sản `TRANSFER_CANCELLED` nếu muốn lịch sử tài sản thể hiện việc từng được đưa vào phiếu rồi hủy.

## Trạng thái đề xuất

```text
DRAFT -> PENDING_APPROVAL -> APPROVED
DRAFT -> PENDING_APPROVAL -> REJECTED
DRAFT -> CANCELLED
PENDING_APPROVAL -> CANCELLED
```

Ý nghĩa:

- `DRAFT`: phiếu mới tạo, còn chỉnh sửa được.
- `PENDING_APPROVAL`: phiếu đã gửi duyệt, chờ người có quyền xử lý.
- `APPROVED`: phiếu đã duyệt, tài sản đã được cập nhật.
- `REJECTED`: phiếu bị từ chối, tài sản không đổi.
- `CANCELLED`: phiếu bị hủy trước khi duyệt xong.

## API endpoints

Tối thiểu cho luồng phiếu:

- `POST /api/asset/transfer-headers`
- `GET /api/asset/transfer-headers`
- `GET /api/asset/transfer-headers/{id}`
- `POST /api/asset/transfer-headers/{id}/submit`
- `POST /api/asset/transfer-headers/{id}/approve`
- `POST /api/asset/transfer-headers/{id}/reject`
- `POST /api/asset/transfer-headers/{id}/cancel`
- `POST /api/asset/transfer-headers/{id}/documents`

API audit đã có:

- `GET /api/asset/audit-logs?entityType=ASSET&entityId={assetId}`
- `GET /api/asset/audit-logs/assets/{assetId}`

## Nguyên tắc implement backend

- Client không được tự truyền các field hệ thống như `actor_username`, `approved_by`, `cancelled_by` tùy ý.
- Backend lấy actor từ JWT/principal.
- Cập nhật phiếu, dòng tài sản, bảng `assets`, và audit log trong cùng transaction.
- Khi xem lịch sử tài sản, lọc `audit_logs` theo `entity_type = 'ASSET'` và `entity_id = assetId`.
- Khi xem lịch sử phiếu, lọc theo `entity_type = 'ASSET_TRANSFER_HEADER'` và `entity_id = transferHeaderId`.
