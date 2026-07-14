# Quy trình bàn giao tài sản

## 1. Mục đích

Quy trình bàn giao tài sản dùng để ghi nhận việc chuyển giao tài sản từ một `cá nhân, phòng ban hoặc chi nhánh` đang quản lý sang cá nhân, phòng ban hoặc chi nhánh tiếp nhận. Mỗi phiên tạo bàn giao sẽ được hiển thị dưới dạng một `Phiếu bàn giao`.

Quy trình được đề cập dưới đây đảm bảo:

- Có danh sách tài sản bàn giao rõ ràng.
- Có thông tin tình trạng tài sản trước khi bàn giao.
- Có lý do và thời gian bàn giao.
- Có thông tin bên bàn giao, bên tiếp nhận và người có thẩm quyền để phê duyệt phiếu bàn giao.
- Có lịch sử xử lý để tra cứu lại khi cần.

## 2. Phạm vi áp dụng

Quy trình này áp dụng đối với các trường hợp sau:

- Bàn giao tài sản từ `nhân sự` này sang nhân sự khác.
- Điều chuyển tài sản giữa `phòng ban`.
- Điều chuyển tài sản giữa `chi nhánh/site`.
- Thu hồi tài sản về kho hoặc đơn vị quản lý.
- Bàn giao tài sản phục vụ dự án hoặc thay đổi đơn vị sử dụng.

## 3. Vai trò tham gia

| Vai trò | Mô tả |
| --- | --- |
| Người tạo phiếu | Người lập phiếu bàn giao và nhập thông tin ban đầu |
| Bên bàn giao | Cá nhân/phòng ban/chi nhánh đang quản lý tài sản |
| Bên tiếp nhận | Cá nhân/phòng ban/chi nhánh nhận tài sản |
| Người duyệt | Người có thẩm quyền duyệt hoặc từ chối phiếu bàn giao |
| Người theo dõi | Người được phép xem trạng thái và lịch sử phiếu |

## 4. Trạng thái phiếu

| Trạng thái | Ý nghĩa |
| --- | --- |
| 1. Nháp | Phiếu mới tạo, còn có thể chỉnh sửa |
| 2. Chờ duyệt | Phiếu đã gửi duyệt, chờ người có thẩm quyền xử lý |
| 3. Đã duyệt | Phiếu được duyệt, thông tin tài sản đã được cập nhật theo nội dung bàn giao |
| 4. Từ chối | Phiếu bị từ chối, tài sản không thay đổi |
| 5. Đã hủy | Phiếu bị hủy trước khi được duyệt (mục `3.`) hoặc từ chối (mục `4.`) |

Luồng trạng thái:

```text
Nháp -> Chờ duyệt -> Đã duyệt
Nháp -> Chờ duyệt -> Từ chối
Nháp hoặc Chờ duyệt -> Đã hủy
```

## 5. Quy trình thực hiện

### Bước 1. Tạo phiếu bàn giao

Người dùng vào chức năng **Tài sản > Bàn giao** và chọn **Tạo phiếu bàn giao**.

Tại bước này, người tạo phiếu nhập các thông tin:

- Thông tin chung của phiếu.
- Loại bàn giao.
- Lý do bàn giao.
- Thời gian bàn giao dự kiến.
- Bên bàn giao.
- Bên tiếp nhận.
- Danh sách tài sản cần bàn giao.
- Tình trạng hiện tại của từng tài sản.
- Tệp đính kèm nếu có.

Sau khi lưu, phiếu ở trạng thái **Nháp**.

Trong trạng thái **Nháp**, thông tin tài sản thực tế trong hệ thống chưa thay đổi.

### Bước 2. Kiểm tra thông tin phiếu

Trước khi gửi duyệt, người tạo phiếu cần kiểm tra:

- Danh sách tài sản đã đúng chưa.
- Tài sản có đúng người/phòng ban/chi nhánh đang quản lý không.
- Tình trạng tài sản trước bàn giao đã được ghi nhận chưa.
- Bên tiếp nhận đã đúng chưa.
- Lý do và thời gian bàn giao đã rõ chưa.
- Tệp đính kèm đã đầy đủ chưa nếu quy trình yêu cầu.

Nếu thông tin chưa đầy đủ, người tạo tiếp tục chỉnh sửa phiếu.

### Bước 3. Gửi phiếu duyệt

Khi thông tin đã đầy đủ, người tạo phiếu bấm **Gửi phiếu**.

Sau khi gửi:

- Phiếu chuyển sang trạng thái **Chờ duyệt**.
- Người tạo không còn chỉnh sửa các thông tin chính của phiếu.
- Tài sản thực tế trong hệ thống vẫn chưa thay đổi.

### Bước 4. Duyệt hoặc từ chối phiếu

Người có thẩm quyền mở phiếu đang **Chờ duyệt** và kiểm tra nội dung.

Nếu đồng ý:

- Người duyệt bấm **Duyệt**.
- Phiếu chuyển sang trạng thái **Đã duyệt**.
- Hệ thống cập nhật thông tin tài sản theo nội dung bàn giao.
- Lịch sử bàn giao được ghi nhận cho phiếu và từng tài sản liên quan.

Nếu không đồng ý:

- Người duyệt bấm **Từ chối**.
- Người duyệt nhập lý do từ chối.
- Phiếu chuyển sang trạng thái **Từ chối**.
- Tài sản thực tế trong hệ thống không thay đổi.

### Bước 5. Hủy phiếu

Phiếu có thể bị hủy khi đang ở trạng thái **Nháp** hoặc **Chờ duyệt**.

Khi hủy phiếu:

- Người hủy cần nhập lý do hủy.
- Phiếu chuyển sang trạng thái **Đã hủy**.
- Tài sản thực tế trong hệ thống không thay đổi.

## 6. Thông tin cần có trên phiếu

### Thông tin chung

- Mã phiếu.
- Tiêu đề phiếu.
- Loại bàn giao.
- Lý do bàn giao.
- Thời gian bàn giao dự kiến.
- Ghi chú.

### Thông tin bên bàn giao

- Chi nhánh/site hiện tại.
- Phòng ban hiện tại.
- Người đang giữ hoặc đơn vị đang quản lý tài sản.

### Thông tin bên tiếp nhận

- Chi nhánh/site tiếp nhận.
- Phòng ban tiếp nhận.
- Người nhận hoặc đơn vị tiếp nhận tài sản.

### Danh sách tài sản

Mỗi tài sản trong phiếu nên thể hiện:

- Tên tài sản.
- Mã tài sản.
- Số serial nếu có.
- Trạng thái hiện tại.
- Tình trạng thực tế trước bàn giao.
- Vị trí hiện tại.
- Giá trị còn lại nếu cần theo dõi tài chính.
- Ghi chú riêng cho tài sản.

### Tệp đính kèm

Có thể đính kèm:

- Biên bản bàn giao.
- Hình ảnh tài sản.
- File kiểm kê.
- Tài liệu liên quan khác.

## 7. Nguyên tắc nghiệp vụ

- Một phiếu có thể gồm nhiều tài sản.
- Phiếu ở trạng thái **Nháp** chưa làm thay đổi dữ liệu tài sản.
- Phiếu ở trạng thái **Chờ duyệt** chỉ chờ xử lý, chưa làm thay đổi dữ liệu tài sản.
- Chỉ khi phiếu được **Đã duyệt**, hệ thống mới cập nhật thông tin tài sản.
- Nếu phiếu bị **Từ chối** hoặc **Đã hủy**, tài sản không thay đổi.
- Mỗi lần duyệt, từ chối hoặc hủy cần ghi nhận người thực hiện, thời gian và lý do nếu có.

## 8. Gợi ý màn hình

Danh sách phiếu bàn giao nên có:

- Mã phiếu.
- Tiêu đề.
- Loại bàn giao.
- Bên bàn giao.
- Bên tiếp nhận.
- Số lượng tài sản.
- Trạng thái.
- Thời gian bàn giao dự kiến.
- Người tạo.
- Người duyệt.

Chi tiết phiếu bàn giao nên có:

- Khối thông tin chung.
- Khối bên bàn giao và bên tiếp nhận.
- Bảng danh sách tài sản.
- Khu vực tệp đính kèm.
- Lịch sử xử lý phiếu.
- Nút thao tác phù hợp với trạng thái phiếu.

## 9. Quyền thao tác

| Quyền | Ý nghĩa |
| --- | --- |
| Xem phiếu bàn giao | Được xem danh sách và chi tiết phiếu |
| Quản lý phiếu bàn giao | Được tạo, sửa nháp, gửi duyệt hoặc hủy phiếu |
| Duyệt phiếu bàn giao | Được duyệt hoặc từ chối phiếu đang chờ duyệt |