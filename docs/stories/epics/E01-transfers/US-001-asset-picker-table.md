# US-001 Bộ chọn tài sản dạng bảng checkbox với lọc catalog item cho phiếu bàn giao

## Status

implemented

## Lane

normal

## Product Contract

Cho phép người dùng khi tạo phiếu bàn giao/thu hồi tài sản có thể:
1. Xem danh sách tài sản khả dụng dưới dạng bảng chi tiết (thay vì dropdown đơn lẻ).
2. Lọc tài sản theo catalog item (`AssetCatalogItemListItem`).
3. Tìm kiếm theo mã tài sản hoặc tên tài sản.
4. Chọn nhiều tài sản cùng lúc thông qua checkbox từng dòng hoặc checkbox "Chọn tất cả".
5. Xem lại danh sách tài sản đã chọn trên bảng và có thể gỡ bỏ trước khi gửi phiếu.

## Relevant Product Docs

- `docs/product/transfers.md`
- `documents/asset-transfer-ba-process.md`
- `documents/asset-transfer-workflow-v7.md`

## Acceptance Criteria

- [x] Hiển thị nút "Thêm tài sản" mở bảng bộ chọn (Asset Picker Table).
- [x] Bộ chọn có ô tìm kiếm (mã/tên tài sản) và dropdown chọn catalog item từ API `loadAssetCatalogItems`.
- [x] Có checkbox chọn tất cả ở header và checkbox từng dòng tài sản.
- [x] Hiển thị các thông tin: STT, Checkbox, Mã tài sản, Tên tài sản, Catalog Item, Trạng thái, Vị trí hiện tại.
- [x] Hỗ trợ phân trang cho bảng bộ chọn.
- [x] Nút xác nhận lưu các tài sản đã chọn vào danh sách phiếu và đóng bộ chọn.
- [x] Bảng tài sản đã chọn hiển thị đầy đủ thông tin và cho phép xóa từng tài sản.
- [x] Chạy qua kiểm tra test (`corepack pnpm test`), linter (`corepack pnpm lint`) và build (`corepack pnpm build`).

## Design Notes

- Commands: N/A (Frontend only)
- Queries: `loadAssetCatalogItems()`
- API: Dùng API hiện có (`GET /asset/catalog-items`)
- Domain rules: Chỉ cho phép chọn các tài sản khả dụng (không bị kẹt trong phiếu chờ duyệt khác)
- UI surfaces: `TransfersPage.tsx` tab "Tạo phiếu"

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `corepack pnpm test` passing (102/102 tests passed) |
| Integration | N/A |
| E2E | N/A |
| Platform | `corepack pnpm build` passing (`tsc -b && vite build` 0 errors) |
| Release | `corepack pnpm lint` passing (`biome check .` 0 errors) |

## Harness Delta

None

## Evidence

- `corepack pnpm --dir frontend test`: 19 test files passed, 102 tests passed (including `filters and multi-selects assets with the asset picker in transfers page`).
- `corepack pnpm --dir frontend lint`: Biome check passed on 77 files, 0 errors, 0 warnings.
- `corepack pnpm --dir frontend build`: Production bundle built cleanly with Vite & TypeScript in 1.11s.
