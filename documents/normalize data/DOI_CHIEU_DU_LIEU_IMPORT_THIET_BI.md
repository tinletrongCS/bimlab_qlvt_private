# Đối chiếu dữ liệu import thiết bị

Ngày rà soát: 18/08/2026.

## Phạm vi

Nguồn đối chiếu là sheet `Thiết bị` gồm 26 cột. File mẫu tải từ trang Danh sách tài sản dùng API `/api/asset/categories/tree` để tạo đồng thời:

- `Thiết bị`: dữ liệu nhập.
- `Loai_ThamChieu`: mã, tên tiếng Việt và quan hệ cha.
- `Cay_PhanLoai`: cây phân loại lấy từ API.

## Bảng đối chiếu

| Cột | Trường Excel | Xử lý hiện tại | Đích lưu trữ | Thiếu hoặc lưu ý |
|---:|---|---|---|---|
| A | STT | Chỉ dùng để đọc dòng | Không lưu | Không cần thêm cột DB |
| B | Mã thiết bị | Đọc nhưng cảnh báo và bỏ qua | `assets.asset_code` do hệ thống tự sinh | Chưa có trường riêng để giữ mã thiết bị nguồn |
| C | Mã hợp đồng | Đọc được cả ô gộp | `assets.contract_number` | Đã bổ sung tại V12; đây là giá trị nguồn, chưa phải FK tới `contracts` |
| D | Số hóa đơn | Đọc được cả ô gộp | `assets.invoice_number` | Đã bổ sung tại V12; hệ thống chưa có bảng hóa đơn riêng |
| E | Tên thiết bị | Lưu trực tiếp | `assets.name` | Đã đủ |
| F | Thông số kỹ thuật | Ghép với Model | `assets.technical_description` | Đã lưu, tối đa 2.000 ký tự |
| G | Phân loại TSCĐ/CCDC | Chuẩn hóa tiếng Việt sang enum | `assets.asset_class` | Đã đủ |
| H | Phân loại lớp con | Chuẩn hóa tiếng Việt sang enum | `assets.fixed_asset_type` hoặc `assets.tool_usage_type` | Đã đủ |
| I | Loại | Tách mã trong `Tên tiếng Việt (MÃ)` | `assets.category_id` | Đã đủ; chỉ chấp nhận node lá đang hoạt động |
| J | Model | Ghép vào mô tả kỹ thuật | `assets.technical_description` | Chưa có cột `model` riêng để lọc/thống kê |
| K | Số seri | Lưu trực tiếp | `assets.serial_number` | Dòng có số lượng lớn hơn 1 không được dùng chung số seri |
| L | Vị trí lắp đặt | Đọc tên và ghi vào notes | `assets.notes` | Chưa map sang `assets.site_id` |
| M | Phòng ban sử dụng | Đọc tên và ghi vào notes | `assets.notes` | Chưa map sang `assets.department_id` |
| N | Nhà cung cấp | Chủ động bỏ qua | Không lưu khi import | Sau này gán hàng loạt từ module Nhà cung cấp |
| O | Nước SX | Lưu trực tiếp | `assets.country_code` | Đã đủ nếu nguồn dùng mã quốc gia ngắn |
| P | Ngày mua | Chuẩn hóa ngày | `assets.purchase_date` | Đã đủ |
| Q | Số lượng | Bung thành nhiều tài sản khi commit | Không lưu số lượng trên từng asset | Đúng với mô hình mỗi tài sản là một bản ghi |
| R | Đơn giá chưa VAT | Lưu theo từng tài sản | `assets.original_cost`, `assets.purchase_cost` | Đã đủ cho giá trước VAT |
| S | Nguyên giá tổng | Hiện bỏ qua | Không lưu | Cần xác định là tổng dòng hay nguyên giá từng tài sản trước khi dùng |
| T | Thuế VAT | Hiện bỏ qua | Không lưu | Chưa có `vat_rate` hoặc `vat_amount` |
| U | Thời gian bảo hành (tháng) | Hiện bỏ qua | Có `assets.warranty_until` nhưng chưa tính | Cần thống nhất ngày bắt đầu bảo hành trước khi quy đổi |
| V | Thời gian KH (năm) | Quy đổi sang tháng | `assets.useful_life_months`, `assets.useful_life_years` | Đã đủ |
| W | Tình trạng | Chuẩn hóa tiếng Việt sang enum | `assets.status` | Đã đủ |
| X | Người quản lý | Hiện bỏ qua | Không lưu | Chưa map nhân sự sang `assets.assigned_employee_id` |
| Y | Ghi chú | Hiện chưa đọc | `assets.notes` | Nên bổ sung sau khi tách phần notes tự sinh từ site/phòng ban |
| Z | Đã nhập nhà cung cấp | Chủ động bỏ qua | Không lưu | Chỉ là cờ xử lý của file nguồn |

## Quan hệ hợp đồng và hóa đơn

- Hệ thống đã có bảng `contracts`, nhưng import thiết bị chưa đủ dữ liệu để liên kết chắc chắn một bản ghi hợp đồng hiện hữu.
- V12 lưu `contract_number` và `invoice_number` trực tiếp trên tài sản như dữ liệu nguồn để không làm mất thông tin.
- Khi triển khai nghiệp vụ mua sắm đầy đủ, nên có quan hệ hợp đồng - nhiều tài sản và bảng hóa đơn/hóa đơn dòng; lúc đó hai cột nguồn dùng để đối soát và chuyển đổi dữ liệu.

## Hành vi của file Excel

- Mẫu tải xuống dùng định dạng `.xlsx`, không có macro. Vùng dữ liệu được mở khóa để nhập/paste; định dạng sheet được bảo vệ không mật khẩu để giữ dropdown, wrap text, font, màu nền và border khi paste từ nguồn khác.
- Dropdown H phụ thuộc vào G và dropdown I phụ thuộc vào H. File `.xlsx` không tự xóa giá trị con khi đổi cha; backend sẽ từ chối dòng không cùng nhánh khi kiểm tra dữ liệu.
- Các ô mẫu dùng font Calibri cỡ 13 và ba cột G/H/I có màu nền nhạt. Excel có thể giữ định dạng nguồn khi paste, nhưng định dạng không ảnh hưởng dữ liệu import.
- Parser kế thừa mã hợp đồng và số hóa đơn gần nhất xuống các dòng trống, bao gồm trường hợp dữ liệu nguồn từng dùng ô gộp.
- Data Validation của Excel chỉ hiện mũi tên khi ô đang được chọn; đây là hành vi mặc định của Excel và không ảnh hưởng danh sách lựa chọn.

## Thứ tự bổ sung đề xuất

1. Map chính xác tên/mã site và phòng ban sang ID.
2. Lưu Model, VAT, thời hạn bảo hành và ghi chú nguồn bằng các trường riêng.
3. Thiết kế bảng hóa đơn và quan hệ hợp đồng - tài sản trước khi tự động liên kết.
4. Map Người quản lý bằng mã nhân viên thay vì tên để tránh trùng người.
