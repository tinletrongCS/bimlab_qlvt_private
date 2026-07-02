# 0008 Permission asset_finance_view — che dữ liệu tài chính tài sản theo quyền

Date: 2026-07-02

## Status

Accepted

## Context

Audit trước đó ghi nhận: mọi người có `asset_access` đều thấy đầy đủ dữ liệu
tài chính của mọi tài sản (nguyên giá, giá mua, khấu hao, giá trị sổ sách,
giá thanh lý) — chủ đích ban đầu là "sổ tài sản dùng chung". Product owner
quyết định siết: dữ liệu tài chính chỉ dành cho nhóm có quyền tài chính,
nhưng KHÔNG được vỡ UX danh sách của người dùng thường.

## Decision

1. Thêm permission `asset_finance_view` (enum `Permission` + catalog seed ở
   bimlab_hrm `DataSeeder`; không cấp mặc định cho role nào — admin cấp qua
   Roles UI khi cần).
2. Nhóm thấy tài chính = `Permission.Sets.FINANCE_VIEWERS` =
   {`asset_finance_view`, `asset_finance_manage`, `asset_manage`} —
   `asset_manage` giữ vì người quản lý nhập/sửa trường tiền tệ.
3. BE là chốt chính: `AssetMapper.toResponse(asset, includeFinance)` null các
   trường tiền tệ (originalCost, purchaseCost, accumulatedDepreciation,
   bookValue, residualValue, depreciationRate, disposalPrice) trên
   list/paged/get/warranty-expiring khi caller ngoài FINANCE_VIEWERS.
   `GET /{id}/depreciation` (thuần tài chính) siết `@PreAuthorize` về đúng
   nhóm này.
4. FE ẩn cột "Giá trị", banner tổng giá trị, bộ lọc theo giá trị, section
   "Tài chính và khấu hao", "Giá thanh lý" (AssetsPage) và tổng giá trị +
   thẻ tiền utilization (DashboardPage) khi thiếu quyền — tránh hiện 0 ₫.

## Alternatives Considered

1. Scope theo `asset_view_self` (chỉ thấy tài chính tài sản của mình) — vỡ
   UX danh sách dùng chung, bị bác.
2. Endpoint riêng `/assets/finance` — phình API, FE phải gọi đôi; mask tại
   mapper rẻ hơn và kín hơn.
3. Xoá field khỏi response cho mọi người + màn hình tài chính riêng — quá
   phạm vi yêu cầu.

## Consequences

Positive:

- Contract API không đổi hình dạng (field vẫn tồn tại, null khi thiếu quyền)
  — client cũ không vỡ.
- Grant linh hoạt per-role qua Roles UI HRM, backfill tự động của DataSeeder
  không cấp thêm cho ai.

Tradeoffs:

- Field null ≠ field không tồn tại: client phải hiểu null là "không có quyền"
  trong ngữ cảnh này (FE đã ẩn hẳn UI nên không lộ).
- `mvn test` (asset-service) + FE lint/test/build là proof hiện có; chưa có
  integration test @WithMockUser cho mask (backlog).

## Follow-Up

- Cân nhắc integration test controller-level cho mask (MockMvc + authorities).
- Excel export/import (asset_manage-only) không bị ảnh hưởng — xác nhận khi QA.
