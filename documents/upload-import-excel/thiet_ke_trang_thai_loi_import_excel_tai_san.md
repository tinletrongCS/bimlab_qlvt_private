# Thiết kế trạng thái và xử lý lỗi khi import Excel danh sách tài sản

Tài liệu này mô tả các trạng thái upload, cách backend trả kết quả validate theo từng dòng Excel, cách sinh file lỗi và các nhóm lỗi/cảnh báo nên áp dụng khi import danh sách tài sản.

---

## 1. Trạng thái upload và trạng thái từng dòng

Khi người dùng upload file Excel, backend nên trả kết quả theo 2 cấp:

- **Cấp toàn bộ file**: cho biết tình trạng chung của lần upload.
- **Cấp từng dòng Excel**: cho biết từng dòng hợp lệ, lỗi hay chỉ có cảnh báo.

### 1.1. Trạng thái ở cấp file

| Trạng thái | Ý nghĩa |
|---|---|
| `VALID` | Toàn bộ file hợp lệ, có thể import |
| `HAS_ERROR` | Có ít nhất một dòng lỗi |
| `IMPORTED` | Đã import thành công |
| `PARTIALLY_IMPORTED` | Đã import một phần các dòng hợp lệ |
| `FAILED` | File lỗi nặng, không đọc được hoặc không đúng định dạng |

Ví dụ:

```json
{
  "uploadId": "IMPORT-20260625-0001",
  "uploadStatus": "HAS_ERROR",
  "totalRows": 5,
  "validRows": 3,
  "errorRows": 2,
  "warningRows": 1
}
```

### 1.2. Trạng thái ở cấp từng dòng

| Trạng thái dòng | Ý nghĩa |
|---|---|
| `VALID` | Dòng hợp lệ, có thể import |
| `INVALID` | Dòng có lỗi, không được import |
| `WARNING` | Dòng có cảnh báo nhưng vẫn có thể import |
| `IMPORTED` | Dòng đã import thành công |
| `SKIPPED` | Dòng bị bỏ qua |

Ví dụ một phần tử trong mảng `rows`:

```json
{
  "rowNumber": 3,
  "status": "INVALID",
  "assetName": "Màn hình Dell 24 inch",
  "categoryCode": "SCREEN_ABC",
  "generatedAssetCodePreview": null,
  "errors": [
    {
      "field": "categoryCode",
      "code": "CATEGORY_NOT_FOUND",
      "message": "Danh mục tài sản SCREEN_ABC chưa được định nghĩa trong hệ thống."
    }
  ],
  "warnings": []
}
```

Trong đó:

| Trường | Ý nghĩa |
|---|---|
| `rowNumber` | Số dòng trong file Excel gốc |
| `status` | Trạng thái xử lý của dòng |
| `assetName` | Tên tài sản đọc được từ Excel |
| `categoryCode` | Mã danh mục tài sản người dùng nhập |
| `generatedAssetCodePreview` | Mã tài sản dự kiến sinh ra nếu dòng hợp lệ |
| `errors` | Danh sách lỗi của dòng |
| `warnings` | Danh sách cảnh báo của dòng |

---

## 2. File lỗi nên sinh từ đâu?

Có 2 cách xử lý, và nên kết hợp cả hai.

### 2.1. Backend trả JSON để frontend hiển thị preview

Backend đọc Excel, validate từng dòng và trả về JSON. Frontend dùng JSON này để hiển thị bảng kết quả kiểm tra.

Ví dụ bảng preview trên giao diện:

| Dòng Excel | Trạng thái | Tên tài sản | Danh mục | Lỗi |
|---:|---|---|---|---|
| 2 | Hợp lệ | Màn hình Dell 24 inch | `MONITOR` | |
| 3 | Lỗi | Màn hình Dell 24 inch | `SCREEN_ABC` | Danh mục chưa tồn tại |
| 4 | Lỗi | Máy in HP | `PRINTER` | Nguyên giá không được âm |

Cách này giúp người dùng biết chính xác dòng nào hợp lệ, dòng nào lỗi, kể cả khi nhiều dòng có tên tài sản giống nhau.

### 2.2. Backend sinh file Excel lỗi để người dùng tải về

Ngoài JSON cho giao diện, backend nên sinh thêm file Excel lỗi từ chính kết quả validate.

File lỗi nên giữ lại các cột dữ liệu gốc và thêm các cột hệ thống:

| Cột thêm vào | Ý nghĩa |
|---|---|
| `Dòng Excel gốc` | Số dòng tương ứng trong file upload ban đầu |
| `Trạng thái` | Lỗi / Cảnh báo / Hợp lệ |
| `Mã lỗi` | Mã lỗi kỹ thuật/nghiệp vụ, ví dụ `CATEGORY_NOT_FOUND` |
| `Mô tả lỗi` | Diễn giải lỗi dễ hiểu cho người dùng |
| `Gợi ý xử lý` | Hướng dẫn người dùng sửa dữ liệu |

Ví dụ file lỗi:

| Dòng Excel gốc | Tên tài sản | Danh mục tài sản | Mã lỗi | Mô tả lỗi | Gợi ý xử lý |
|---:|---|---|---|---|---|
| 3 | Màn hình Dell 24 inch | `SCREEN_ABC` | `CATEGORY_NOT_FOUND` | Danh mục tài sản chưa tồn tại | Chọn lại danh mục hợp lệ như `MONITOR`, `LAPTOP`, `PRINTER` |
| 4 | Máy in HP | `PRINTER` | `NEGATIVE_VALUE` | Nguyên giá không được nhỏ hơn 0 | Kiểm tra lại cột nguyên giá |

### 2.3. Khuyến nghị

Nên có cả:

```text
JSON để frontend hiển thị preview
File Excel lỗi để người dùng tải về sửa và upload lại
```

---

## 3. Thế nào là lỗi?

Có thể chia lỗi thành 5 nhóm chính.

---

### 3.1. Nhóm 1: Lỗi cấu trúc file

Đây là lỗi ở cấp file hoặc sheet, thường khiến hệ thống không thể đọc dữ liệu đúng cách.

| Mã lỗi | Khi nào xảy ra |
|---|---|
| `INVALID_FILE_FORMAT` | File không phải định dạng `.xlsx` |
| `MISSING_SHEET` | Không có sheet `HoSoTaiSan_import` |
| `MISSING_REQUIRED_COLUMN` | Thiếu cột bắt buộc, ví dụ `Tên tài sản`, `Danh mục tài sản` |
| `INVALID_TEMPLATE_VERSION` | File mẫu sai phiên bản hoặc không còn tương thích |

Ví dụ message:

```text
File không đúng mẫu import tài sản. Vui lòng tải lại file mẫu mới nhất từ hệ thống.
```

---

### 3.2. Nhóm 2: Lỗi thiếu dữ liệu bắt buộc

Đây là lỗi khi một dòng Excel thiếu thông tin bắt buộc để tạo tài sản.

| Mã lỗi | Khi nào xảy ra |
|---|---|
| `REQUIRED_FIELD_MISSING` | Thiếu trường bắt buộc |
| `ASSET_NAME_REQUIRED` | Chưa nhập tên tài sản |
| `CATEGORY_REQUIRED` | Chưa nhập danh mục tài sản |
| `ASSET_CLASS_REQUIRED` | Chưa chọn TSCĐ/CCDC |
| `LOCATION_REQUIRED` | Thiếu thông tin nơi sử dụng nếu hệ thống yêu cầu |

Ví dụ message:

```text
Dòng 5: Tên tài sản là bắt buộc.
```

---

### 3.3. Nhóm 3: Lỗi danh mục và tham chiếu

Nhóm này dùng để kiểm tra các giá trị cần đối chiếu với dữ liệu đã có trong hệ thống, đặc biệt là danh mục tài sản.

| Mã lỗi | Khi nào xảy ra |
|---|---|
| `CATEGORY_NOT_FOUND` | Danh mục nhập trong Excel không tồn tại |
| `CATEGORY_NOT_LEAF` | Người dùng chọn node cha như `FIXED_ASSET`, `TANGIBLE`, `IT_EQUIPMENT` |
| `CATEGORY_INACTIVE` | Danh mục đã ngưng sử dụng |
| `CATEGORY_CLASS_MISMATCH` | `asset_class = FIXED_ASSET` nhưng danh mục nằm dưới nhánh CCDC, hoặc ngược lại |
| `CATALOG_ITEM_NOT_FOUND` | Mẫu tài sản không tồn tại nếu người dùng có nhập |
| `CATALOG_CATEGORY_MISMATCH` | Mẫu tài sản không thuộc danh mục đã chọn |
| `DEPARTMENT_NOT_FOUND` | Phòng ban không tồn tại |
| `SITE_NOT_FOUND` | Chi nhánh/công trường không tồn tại |
| `VENDOR_NOT_FOUND` | Nhà cung cấp không tồn tại nếu có nhập |

Ví dụ message:

```text
Dòng 3: Danh mục SCREEN_ABC chưa được định nghĩa trong hệ thống.
```

Ví dụ khác:

```text
Dòng 7: Danh mục IT_EQUIPMENT là nhóm cha, vui lòng chọn node nhỏ hơn như MONITOR, LAPTOP hoặc PRINTER.
```

---

### 3.4. Nhóm 4: Lỗi kiểu dữ liệu và giá trị

Đây là lỗi khi dữ liệu nhập không đúng kiểu hoặc không nằm trong giới hạn hợp lệ.

| Mã lỗi | Khi nào xảy ra |
|---|---|
| `INVALID_DATE_FORMAT` | Ngày nhập sai định dạng |
| `DATE_IN_FUTURE` | Ngày nghiệp vụ không được phép nằm trong tương lai |
| `INVALID_NUMBER_FORMAT` | Giá trị số/tiền bị nhập sai định dạng |
| `NEGATIVE_VALUE` | Giá tiền, nguyên giá, khấu hao hoặc giá trị sổ sách bị âm |
| `INVALID_ENUM_VALUE` | Giá trị enum không hợp lệ, ví dụ `asset_class` không phải `FIXED_ASSET` hoặc `TOOL_EQUIPMENT` |
| `TEXT_TOO_LONG` | Nội dung vượt quá độ dài cho phép |

Cần lưu ý: không phải trường ngày nào trong tương lai cũng là lỗi.

| Trường ngày | Có thể là tương lai không? | Ghi chú |
|---|---:|---|
| `purchase_date` | Không nên | Ngày mua thường không được lớn hơn ngày hiện tại |
| `use_date` | Không nên | Giai đoạn số hóa tài sản hiện hữu thì không nên ở tương lai |
| `depreciation_start_date` | Không nên | Thường không được lớn hơn ngày hiện tại |
| `warranty_until` | Có | Ngày hết bảo hành có thể nằm trong tương lai |
| `disposal_date` | Không nên nếu chưa thanh lý | Chỉ hợp lệ khi trạng thái là thanh lý |

Rule đề xuất:

```text
purchase_date, use_date, depreciation_start_date không được lớn hơn ngày hiện tại.
warranty_until được phép lớn hơn ngày hiện tại.
```

---

### 3.5. Nhóm 5: Lỗi logic nghiệp vụ

Đây là lỗi khi từng giá trị riêng lẻ có thể đúng, nhưng khi đặt chung với nhau thì không hợp lý.

| Mã lỗi | Khi nào xảy ra |
|---|---|
| `INVALID_CLASS_TYPE_COMBINATION` | TSCĐ nhưng lại nhập `tool_usage_type`, hoặc CCDC nhưng lại nhập `fixed_asset_type` |
| `MISSING_FIXED_ASSET_TYPE` | `asset_class = FIXED_ASSET` nhưng thiếu hữu hình/vô hình |
| `MISSING_TOOL_USAGE_TYPE` | `asset_class = TOOL_EQUIPMENT` nhưng thiếu dùng một lần/nhiều lần |
| `BOOK_VALUE_GREATER_THAN_ORIGINAL_COST` | Giá trị sổ sách lớn hơn nguyên giá |
| `DEPRECIATION_GREATER_THAN_ORIGINAL_COST` | Khấu hao lũy kế lớn hơn nguyên giá |
| `INVALID_DATE_ORDER` | Thứ tự ngày không hợp lý, ví dụ ngày bắt đầu khấu hao trước ngày mua |
| `DUPLICATE_ROW_IN_FILE` | Có dòng trùng trong cùng file nếu hệ thống có rule kiểm tra trùng |
| `DUPLICATE_EXISTING_ASSET` | Dữ liệu có dấu hiệu trùng với tài sản đã có trong hệ thống |

Ví dụ message:

```text
Dòng 10: Tài sản cố định phải chọn loại hữu hình hoặc vô hình.
```

Ví dụ khác:

```text
Dòng 12: Giá trị sổ sách không được lớn hơn nguyên giá.
```

---

## 4. Cảnh báo là gì và khác lỗi như thế nào?

Không phải dữ liệu nào chưa hoàn chỉnh cũng nên xem là lỗi. Một số trường hợp chỉ nên là cảnh báo để người dùng biết, nhưng vẫn cho phép import.

### 4.1. Khác nhau giữa lỗi và cảnh báo

| Loại | Có được import không? | Ý nghĩa |
|---|---:|---|
| Error | Không | Dữ liệu sai hoặc thiếu thông tin bắt buộc |
| Warning | Có thể | Dữ liệu vẫn import được nhưng cần người dùng lưu ý |

### 4.2. Một số warning đề xuất

| Mã warning | Khi nào xảy ra |
|---|---|
| `ASSET_CODE_IGNORED` | Người dùng nhập mã tài sản nhưng hệ thống sẽ bỏ qua và tự sinh mã |
| `MISSING_OPTIONAL_FIELD` | Thiếu trường không bắt buộc |
| `HIGH_VALUE_WITHOUT_DEPRECIATION` | Nguyên giá lớn nhưng chưa nhập thông tin khấu hao |
| `WARRANTY_EXPIRED` | Tài sản đã hết bảo hành |
| `POSSIBLE_DUPLICATE_NAME` | Có tài sản cùng tên, nhưng chưa chắc là lỗi |
| `OLD_PURCHASE_DATE` | Ngày mua quá cũ, cần kiểm tra lại |
| `MISSING_VENDOR` | Chưa nhập nhà cung cấp, nhưng hệ thống không bắt buộc |

Ví dụ nếu người dùng cố tình nhập mã tài sản trong Excel:

```json
{
  "field": "assetCode",
  "code": "ASSET_CODE_IGNORED",
  "message": "Mã tài sản trong file Excel sẽ không được sử dụng. Hệ thống sẽ tự sinh mã tài sản mới."
}
```

Trường hợp này nên là **warning**, không phải error, vì hệ thống vẫn có thể import dòng đó bằng cách tự sinh mã tài sản.

### 4.3. Quy tắc xử lý warning

Có thể áp dụng quy tắc:

```text
Nếu dòng chỉ có warning và không có error:
- Cho phép import.
- Hiển thị cảnh báo ở màn hình preview.
- Ghi lại warning trong file kết quả import.

Nếu dòng có error:
- Không import dòng đó.
- Hiển thị lỗi cụ thể.
- Đưa dòng đó vào file lỗi để người dùng sửa và upload lại.
```

---

## 5. Kết luận đề xuất

Backend nên trả:

```text
uploadStatus ở cấp file
rows[] ở cấp từng dòng
errors[] và warnings[] cho từng dòng
rowNumber để đối chiếu với Excel gốc
```

Các lỗi tối thiểu nên có:

```text
- Danh mục không tồn tại
- Danh mục không phải node lá
- Sai tổ hợp TSCĐ/CCDC với hữu hình/vô hình/dùng một lần/nhiều lần
- Thiếu trường bắt buộc
- Sai định dạng ngày
- Ngày nghiệp vụ không hợp lệ
- Giá trị tiền âm
- Giá trị sổ sách/khấu hao sai logic
```

Cách này giúp người dùng không cần đoán bằng mắt, kể cả khi có nhiều tài sản trùng tên. Hệ thống sẽ chỉ rõ: dòng Excel nào lỗi, lỗi gì, sửa như thế nào.
