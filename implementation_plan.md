# Thêm bộ chọn tài sản dạng bảng checkbox với lọc theo danh mục vào form tạo phiếu bàn giao

## Bối cảnh

Hiện tại, phần chọn tài sản trong form "Tạo phiếu bàn giao" ([TransfersPage.tsx](file:///d:/BIMLab/BIMLab_QLVT/frontend/src/pages/TransfersPage.tsx#L1564-L1601)) chỉ dùng `SearchableSelect` dropdown — chọn từng tài sản một. Không có lọc theo danh mục, không tick nhiều cùng lúc.

**Yêu cầu**: Thay thế dropdown hiện tại bằng **bảng tài sản có checkbox tick chọn nhiều** + **bộ lọc theo danh mục (category)** + **tìm kiếm theo tên/mã tài sản**.

## Intake Classification

```
Lane: Normal
Reason: Thay đổi UI frontend, không đụng chạm Auth, DB schema, API contract.
Risk flags: Existing behavior (1 flag - thay đổi UX chọn tài sản đã có).
Docs: documents/asset-transfer-ba-process.md, documents/asset-transfer-workflow-v7.md
Validation: Lint, build, visual verification.
```

## Proposed Changes

### Frontend — TransfersPage.tsx

#### [MODIFY] [TransfersPage.tsx](file:///d:/BIMLab/BIMLab_QLVT/frontend/src/pages/TransfersPage.tsx)

Thay thế khu vực "Danh sách tài sản bàn giao/thu hồi" (dòng ~1564–1826) với thiết kế mới gồm 2 phần:

**Phần 1: Bảng chọn tài sản (Asset Picker Table)** — hiển thị khi bấm nút "Thêm tài sản"

Bảng popup/inline chứa danh sách `availableAssets` với:

| Thành phần | Chi tiết |
| :--- | :--- |
| **Checkbox "Chọn tất cả"** | Ở header, tick/bỏ tick toàn bộ tài sản đang hiển thị (sau khi lọc) |
| **Checkbox từng dòng** | Tick để chọn/bỏ chọn tài sản cụ thể |
| **Dropdown lọc danh mục** | `SearchableSelect` load từ `loadAssetCategories()` API đã có sẵn. Khi chọn 1 danh mục → chỉ hiển thị tài sản thuộc danh mục đó (dựa trên `AssetItem.assetCategory?.id` hoặc `AssetItem.category`) |
| **Input tìm kiếm** | Lọc theo `assetCode` hoặc `name` |
| **Cột hiển thị** | STT, Checkbox, Mã tài sản, Tên tài sản, Danh mục, Trạng thái, Vị trí hiện tại |
| **Phân trang** | Sử dụng `TransferListPagination` component hiện có |
| **Nút "Xác nhận chọn"** | Đóng popup/khu vực picker, đưa các tài sản đã tick vào `selectedAssetIds` |

**Phần 2: Bảng tài sản đã chọn (Selected Assets Table)** — giữ nguyên bảng hiện tại

- Hiển thị danh sách tài sản đã được chọn (từ `selectedAssetIds`)
- Giữ nguyên các cột: STT, Tài sản, Hiện trạng, Thông tin điều chuyển, Ghi chú, Xóa
- Giữ nguyên phân trang

**State mới cần thêm:**

```typescript
// Bộ chọn tài sản
const [showAssetPicker, setShowAssetPicker] = useState(false);
const [pickerCategoryFilter, setPickerCategoryFilter] = useState("");
const [pickerSearchQuery, setPickerSearchQuery] = useState("");
const [pickerTempSelected, setPickerTempSelected] = useState<Set<number>>(new Set());
const [pickerPage, setPickerPage] = useState(1);
const [pickerPageSize, setPickerPageSize] = useState(10);

// Danh sách categories (load 1 lần khi mở picker)
const [categories, setCategories] = useState<AssetCategory[]>([]);
```

**Logic lọc:**

```typescript
const filteredPickerAssets = useMemo(() => {
  return availableAssets.filter((asset) => {
    // Lọc theo danh mục
    if (pickerCategoryFilter) {
      const catId = Number(pickerCategoryFilter);
      const assetCatId = asset.assetCategory?.id;
      const assetCatName = asset.assetCategory?.name || asset.category;
      if (assetCatId !== catId && assetCatName !== pickerCategoryFilter) return false;
    }
    // Lọc theo search query
    if (pickerSearchQuery) {
      const q = pickerSearchQuery.toLowerCase();
      if (!asset.assetCode.toLowerCase().includes(q) && !asset.name.toLowerCase().includes(q))
        return false;
    }
    return true;
  });
}, [availableAssets, pickerCategoryFilter, pickerSearchQuery]);
```

**Luồng UX:**

```
[Bấm "Thêm tài sản"]
    → Mở bảng picker (inline hoặc modal)
    → Chọn bộ lọc danh mục / tìm kiếm
    → Tick checkbox từng tài sản hoặc "Chọn tất cả"
    → Bấm "Xác nhận chọn N tài sản"
    → Đóng picker, merge vào selectedAssetIds
    → Bảng "Tài sản đã chọn" hiển thị danh sách mới
```

---

### Frontend — Styles

#### [MODIFY] [app.css](file:///d:/BIMLab/BIMLab_QLVT/frontend/src/styles/app.css)

Thêm CSS cho bảng picker tài sản:
- `.transfer-asset-picker` — container chính
- `.transfer-asset-picker-filters` — hàng lọc (danh mục + search)
- `.transfer-asset-picker-table` — bảng với checkbox
- `.transfer-asset-picker-checkbox` — style cho checkbox
- `.transfer-asset-picker-actions` — nút xác nhận/hủy

---

## Không thay đổi

- **Backend API**: Không thay đổi. Dùng `loadAssetCategories()` API đã có sẵn.
- **DB Schema**: Không thay đổi.
- **Logic submit phiếu**: `selectedAssetIds` state giữ nguyên cấu trúc, hàm `handleSubmit()` không cần sửa.
- **Bảng tài sản đã chọn**: Giữ nguyên UX hiện tại.

## User Review Required

> [!IMPORTANT]
> **Chọn kiểu hiển thị Asset Picker**: Có 2 phương án:
> 1. **Inline expand** — Bảng picker mở ngay bên dưới heading "Danh sách tài sản", push bảng đã chọn xuống. Ưu: Đơn giản, không che nội dung khác. Nhược: Trang dài hơn.
> 2. **Modal popup** — Bảng picker hiển thị trong modal overlay. Ưu: Gọn, tập trung. Nhược: Che form phía dưới.
>
> **Mặc định sẽ chọn phương án 1 (Inline)** trừ khi bạn yêu cầu khác.

## Verification Plan

### Automated Tests
```bash
cd frontend
corepack pnpm lint
corepack pnpm build
```

### Manual Verification
- Mở tab "Tạo phiếu" → Bấm "Thêm tài sản" → Xác nhận bảng picker hiển thị
- Chọn danh mục trong dropdown → Xác nhận danh sách tài sản lọc đúng
- Nhập từ khóa tìm kiếm → Xác nhận lọc theo mã/tên
- Tick checkbox nhiều tài sản → Bấm "Xác nhận" → Xác nhận bảng "Đã chọn" cập nhật đúng
- Tick "Chọn tất cả" → Xác nhận toàn bộ trang hiện tại được chọn
- Xóa tài sản từ bảng đã chọn → Xác nhận picker cập nhật lại
