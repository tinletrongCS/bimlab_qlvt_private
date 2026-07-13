# Luồng bàn giao tài sản - V7

## Các thay đổi nền tảng trong V7

Migration `V7__expand_asset_transfer_workflow.sql` mở rộng nghiệp vụ bàn giao theo hướng có phiếu, có nhiều tài sản trong một phiếu, có biên bản và có xác nhận nhiều người.

### Bảng mới

`asset.asset_transfer_headers`

- Là phiếu bàn giao/header.
- Một phiếu có thể gồm nhiều tài sản.
- Quản lý trạng thái phiếu: `DRAFT`, `PENDING_CONFIRM`, `PENDING_APPROVAL`, `APPROVED`, `COMPLETED`, `REJECTED`, `CANCELLED`.
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
| `ASSET_TRANSFER_HEADER` | Một phiếu bàn giao | `asset.asset_transfer_headers.id` | Xem vòng đời phiếu: tạo, gửi xác nhận, duyệt, hủy, hoàn tất |
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
- `action = TRANSFER_CREATED`, `TRANSFER_APPLIED`, `TRANSFER_COMPLETED`, `TRANSFER_CANCELLED`, ...

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

Log theo phiếu giúp trả lời: ai tạo phiếu, ai gửi xác nhận, ai duyệt, ai hủy, lý do gì.

## Luồng bàn giao hoàn chỉnh

### 1. Tạo phiếu nháp

Người dùng chọn một hoặc nhiều tài sản từ danh sách tài sản.

Backend tạo:

- Một dòng `asset_transfer_headers` với `status = DRAFT`.
- Nhiều dòng `asset_transfers`, mỗi dòng ứng với một tài sản.

Ở bước này chưa cập nhật bảng `asset.assets`.

Audit nên ghi:

- 1 log cho phiếu: `TRANSFER_DRAFT_CREATED`.
- 1 log cho mỗi tài sản: `TRANSFER_LINE_ADDED`, `entity_type = ASSET`.

### 2. Gửi xác nhận

Người tạo bấm "Gửi xác nhận".

Backend:

- Đổi phiếu: `DRAFT -> PENDING_CONFIRM`.
- Tạo các dòng `asset_transfer_confirmations` cần thiết.

Ví dụ bàn giao nhân sự:

- `HANDOVER`: người đang giữ tài sản.
- `RECEIVER`: người nhận tài sản.
- `MANAGER`: quản lý nếu quy trình yêu cầu.

Audit:

- Log phiếu: `TRANSFER_SUBMITTED`.

### 3. Xác nhận phiếu

Người có quyền/vai trò phù hợp xác nhận.

Không làm kiểu voting. Backend chỉ cần kiểm tra:

- User hiện tại là người được gán trong dòng confirmation, hoặc
- User có permission quản trị bàn giao, ví dụ `asset_manage`, `asset_assign`, hoặc permission transfer riêng sau này.

Nếu đồng ý:

- `asset_transfer_confirmations.status = APPROVED`.

Nếu từ chối:

- `asset_transfer_confirmations.status = REJECTED`.
- Phiếu có thể chuyển `REJECTED`.

Audit:

- Log phiếu: `TRANSFER_CONFIRM_APPROVED` hoặc `TRANSFER_CONFIRM_REJECTED`.
- Nếu từ chối, ghi lý do vào `changed_fields` hoặc `after_data`.

### 4. Duyệt phiếu

Nếu quy trình cần cấp duyệt riêng, người có quyền duyệt bấm "Duyệt".

Backend:

- Kiểm tra các confirmation bắt buộc đã `APPROVED`.
- Đổi phiếu: `PENDING_CONFIRM -> APPROVED`.

Audit:

- Log phiếu: `TRANSFER_APPROVED`.

Nếu không cần bước duyệt riêng, có thể bỏ qua `APPROVED` và chuyển thẳng sang `COMPLETED` khi đủ xác nhận.

### 5. Hoàn tất bàn giao

Người có quyền bấm "Hoàn tất".

Backend trong một transaction:

- Đổi phiếu: `APPROVED -> COMPLETED`.
- Đổi từng dòng `asset_transfers.line_status = COMPLETED`.
- Cập nhật từng tài sản trong `asset.assets`:
  - `assigned_employee_id`
  - `department_id`
  - `site_id`
  - `project_id`
  - `status`
- Ghi snapshot trước/sau vào `before_data`, `after_data`, `changed_fields` của audit log.

Audit:

- 1 log phiếu: `TRANSFER_COMPLETED`.
- 1 log riêng cho mỗi tài sản: `TRANSFER_COMPLETED`, `entity_type = ASSET`.

### 6. Biên bản và file đính kèm

File biên bản, file scan chữ ký, hình ảnh bàn giao được upload lên MinIO.

Backend tạo dòng:

```text
asset_transfer_documents.transfer_header_id = id phiếu
asset_transfer_documents.document_type = HANDOVER_MINUTES / SIGNED_MINUTES / IMAGE / ATTACHMENT
```

Audit:

- Log phiếu: `TRANSFER_DOCUMENT_ADDED`.

### 7. Hủy phiếu

Chỉ cho hủy khi phiếu chưa `COMPLETED`.

Backend:

- Đổi phiếu sang `CANCELLED`.
- Ghi `cancel_reason`, `cancelled_by`, `cancelled_at`.
- Không cập nhật `asset.assets`.

Audit:

- Log phiếu: `TRANSFER_CANCELLED`.
- Có thể log từng tài sản `TRANSFER_CANCELLED` nếu muốn lịch sử tài sản thể hiện việc từng được đưa vào phiếu rồi hủy.

## Trạng thái đề xuất

Luồng ngắn:

```text
DRAFT -> PENDING_CONFIRM -> COMPLETED
```

Luồng đầy đủ:

```text
DRAFT -> PENDING_CONFIRM -> APPROVED -> COMPLETED
```

Nhánh lỗi:

```text
PENDING_CONFIRM -> REJECTED
DRAFT/PENDING_CONFIRM/APPROVED -> CANCELLED
```

## API nên có

Tối thiểu cho luồng phiếu:

- `POST /api/asset/transfer-headers`
- `GET /api/asset/transfer-headers`
- `GET /api/asset/transfer-headers/{id}`
- `POST /api/asset/transfer-headers/{id}/submit`
- `POST /api/asset/transfer-headers/{id}/confirm`
- `POST /api/asset/transfer-headers/{id}/approve`
- `POST /api/asset/transfer-headers/{id}/complete`
- `POST /api/asset/transfer-headers/{id}/cancel`
- `POST /api/asset/transfer-headers/{id}/documents`

API audit đã có:

- `GET /api/asset/audit-logs?entityType=ASSET&entityId={assetId}`
- `GET /api/asset/audit-logs/assets/{assetId}`

## Nguyên tắc implement backend

- Client không được tự truyền `actor_username`, `approved_by`, `completed_by` tùy ý.
- Backend lấy actor từ JWT/principal.
- Cập nhật phiếu, dòng tài sản, bảng `assets`, và audit log trong cùng transaction.
- Khi xem lịch sử tài sản, lọc `audit_logs` theo `entity_type = 'ASSET'` và `entity_id = assetId`.
- Khi xem lịch sử phiếu, lọc theo `entity_type = 'ASSET_TRANSFER_HEADER'` và `entity_id = transferHeaderId`.
