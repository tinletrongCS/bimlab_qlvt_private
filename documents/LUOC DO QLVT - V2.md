# **Lược đồ chi tiết CSDL QLVT sau cải tiến** 

Tài liệu này mô tả lược đồ CSDL chi tiết sau khi áp dụng các đề xuất trong `de-xuat-caitien-schema-qlvt.md` . 

Phạm vi chính là quản lý tài sản và công cụ dụng cụ. Các nghiệp vụ mua bán chỉ giữ ở mức tham chiếu khi cần, không đưa vào lõi quản lý tài sản. 

## **1. Quy ước chung** 

### **1.1. Schema** 

Toàn bộ bảng nghiệp vụ QLVT đặt trong schema: 

|**Schema**|**Ý nghĩa**|
|---|---|
|`asset`|Nhóm bảng quản lý tài sản, công cụ dụng cụ,|
||danh mục, QR, tài liệu, điều chuyển, bảo trì|



### **1.2. Kiểu dữ liệu chuẩn** 

|**Kiểu**|**Cách dùng**|
|---|---|
|`bigint`|Khóa chính, khóa ngoại, id tham chiếu tới<br>service khác|
|`varchar(n)`|Chuỗi ngắn có giới hạn độ dài|
|`text`|Nội dung dài, ít cần lọc chính xác|
|`numeric(18,2)`|Giá trị tiền tệ|
|`numeric(18,4)`|Số đo kỹ thuật cần độ chính xác cao hơn|
|`numeric(8,4)`|Tỷ lệ, ví dụ tỷ lệ khấu hao|
|`integer`|Số nguyên, năm, số tháng, số lượng|
|`boolean`|Cờ đúng/sai|
|`date`|Ngày nghiệp vụ|
|`timestamp`|Thời điểm phát sinh dữ liệu|



### **1.3. Enum nghiệp vụ** 

Các cột enum có thể triển khai bằng `varchar` trong giai đoạn đầu để linh hoạt, sau đó chuẩn hóa thành PostgreSQL enum hoặc lookup table nếu cần. 

|**Enum**|**Giá trị đề xuất**|**Ý nghĩa**|
|---|---|---|
|`asset_class`|`FIXED_ASSET`|Tài sản cố định|
|`asset_class`|`TOOL_EQUIPMENT`|Công cụ dụng cụ|
|`fixed_asset_type`|`TANGIBLE`|Tài sản cố định hữu hình|



|**Enum**|**Giá trị đề xuất**|**Ý nghĩa**|
|---|---|---|
|`fixed_asset_type`|`INTANGIBLE`|Tài sản cố định vô hình|
|`tool_usage_type`|`SINGLE_USE`|Công cụ dụng cụ dùng một lần|
|`tool_usage_type`|`MULTI_USE`|Công cụ dụng cụ dùng nhiều<br>lần|
|`asset_status`|`IN_STOCK`|Đang trong kho|
|`asset_status`|`ASSIGNED`|Đã cấp phát/đang sử dụng|
|`asset_status`|`MAINTENANCE`|Đang bảo trì|
|`asset_status`|`LOST`|Mất/hỏng không còn kiểm soát|
|`asset_status`|`DISPOSED`|Đã thanh lý|
|`depreciation_method`|`STRAIGHT_LINE`|Khấu hao đường thẳng|
|`depreciation_method`|`DECLINING_BALANCE`|Khấu hao số dư giảm dần|
|`depreciation_method`|`NONE`|Không tính khấu hao|
|`catalog_type`|`ASSET`|Danh mục tài sản|
|`catalog_type`|`TOOL`|Danh mục công cụ dụng cụ|
|`catalog_type`|`MATERIAL`|Danh mục vật tư tham chiếu|
|`catalog_type`|`PRODUCT_REFERENCE`|Thành phẩm/vật tư thành phẩm<br>tham chiếu|



## **2. Tổng quan quan hệ bảng** 

|**Bảng**|**Vai trò**|
|---|---|
|`asset.asset_categories`|Cây phân loại tài sản, thay thế<br>`assets.category`dạng text tự do|
|`asset.asset_code_sequences`|Bộ đếm sinh mã tài sản theo từng phân loại|
|`asset.asset_catalog_items`|Danh mục gốc của tài sản, CCDC, vật tư/thành<br>phẩm tham chiếu|
|`asset.assets`|Bảng lưu từng tài sản/CCDC thực tế|
|`asset.asset_value_snapshots`|Lịch sử giá trị tài sản theo kỳ|
|`asset.asset_documents`|Metadata file đính kèm, file vật lý lưu ở MinIO|
|`asset.asset_qr_codes`|Metadata QR, lịch sử in/thu hồi nếu cần|
|`asset.asset_booking_sessions`|Phiên đặt lịch mượn/sử dụng tài sản|
|`asset.asset_transfer_headers`|Thông tin chung của phiếu bàn giao/điều chuyển|
|`asset.asset_transfers`|Các dòng tài sản thuộc phiếu bàn giao/điều chuyển|
|`asset.asset_transfer_documents`|Tài liệu đính kèm phiếu bàn giao|
|`asset.asset_transfer_confirmations`|Xác nhận và chữ ký của các bên trong phiếu bàn giao|
|`asset.audit_logs`|Nhật ký thay đổi dữ liệu nghiệp vụ|
|`asset.audit_log_definitions`|Danh mục định nghĩa hành động audit|
|`asset.maintenance_records`|Lịch sử bảo trì, sửa chữa, kiểm định|
|`asset.vendors`|Nhà cung cấp, đơn vị bảo trì, đơn vị cung cấp<br>license|
|`asset.subscriptions`|Gói phần mềm/license/dịch vụ định kỳ, liên kết<br>tài sản vô hình nếu có|



## **3.** **`asset.asset_categories`** 

### **3.1. Ý nghĩa** 

Bảng định nghĩa cây phân loại tài sản. Đây là bảng chuẩn hóa thay cho việc lưu `category` bằng chuỗi tự do trong bảng `assets` . 

Ví dụ cây phân loại: 

- `FIXED_ASSET` : Tài sản cố định 

- `TANGIBLE` : Tài sản hữu hình 

- `INTANGIBLE` : Tài sản vô hình 

- `TOOL_EQUIPMENT` : Công cụ dụng cụ 

- `TOOL_SINGLE_USE` : Công cụ dụng cụ dùng một lần 

- `TOOL_MULTI_USE` : Công cụ dụng cụ dùng nhiều lần 

### **3.2. Cột** 

|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
|`id`|`bigint`|Có|generated|PK|Khóa chính|
|`code`|`varchar(60`<br>`)`|Có||Unique|Mã phân loại,<br>ví dụ<br>`FIXED_ASSE`<br>`T`,`TANGIBLE`|
|`name`|`varchar(18`<br>`0)`|Có|||Tên phân loại<br>hiển thị|
|`parent_id`|`bigint`|Không||FK -><br>`asset_cate`<br>`gories.id`|Nhóm cha<br>trong cây phân<br>loại|
|`asset_clas`<br>`s`|`varchar(40`<br>`)`|Có|||Nhóm lớn:<br>`FIXED_ASSE`<br>`T`hoặc<br>`TOOL_EQUIP`<br>`MENT`|
|`descriptio`<br>`n`|`varchar(50`<br>`0)`|Không|||Mô tả phân<br>loại|
|`is_active`|`boolean`|Có|`true`||Còn sử dụng<br>hay không|
|`created_at `|`timestamp`|Có|`now()`||Thời điểm tạo|
|`updated_at `|`timestamp`|Có|`now()`||Thời điểm cập<br>nhật|



### **3.3. Ràng buộc đề xuất** 

|**Ràng buộc**|**Nội dung**|
|---|---|
|Unique|`code`|
|FK|`parent_id`tham chiếu<br>`asset.asset_categories(id)`|
|Check|`asset_class in ('FIXED_ASSET',`<br>`'TOOL_EQUIPMENT')`|
|Index|`parent_id`,`asset_class`,`is_active`|



## **4.** **`asset.asset_code_sequences`** 

### **4.1. Ý nghĩa** 

Bảng lưu bộ đếm sinh mã tài sản theo từng phân loại. Mỗi `category_id` có một dòng sequence riêng, giúp backend cấp mã tăng dần theo nhóm tài sản/CCDC mà không phải scan bảng `asset.assets` . 

Bảng này chỉ chứa dữ liệu vận hành phát sinh khi hệ thống bắt đầu sinh mã, không phải dữ liệu mẫu. Migration V3 chỉ tạo cấu trúc bảng rỗng. 

### **4.2. Cột** 

|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
|`category_i`<br>`d`|`bigint`|Có||PK, FK -><br>`asset_cate`<br>`gories.id`|Phân loại sở<br>hữu bộ đếm mã|
|`current_nu`<br>`mber`|`bigint`|Có|`0`||Số thứ tự hiện<br>tại đã cấp trong<br>phân loại|
|`created_at `|`timestamp`|Có|`now()`||Thời điểm tạo<br>bộ đếm|
|`updated_at `|`timestamp`|Có|`now()`||Thời điểm cập<br>nhật gần nhất|



### **4.3. Ràng buộc đề xuất** 

|**Ràng buộc**|**Nội dung**|
|---|---|
|PK|`category_id`|
|FK|`category_id`tham chiếu|
||`asset.asset_categories(id)`|
|Check|`current_number >= 0`|



## **5.** **`asset.asset_catalog_items`** 

### **5.1. Ý nghĩa** 

Bảng lưu danh mục gốc lấy từ các file Excel như `Danh mục vật tư - CCDC.xls` và phần cần dùng của `Danh mục vật tư - Thành phẩm.xls` . 

Bảng này không đại diện cho một tài sản thực tế đang được gán cho ai đó. Nó là master data để tạo tài sản thực tế nhanh hơn và thống nhất tên, đơn vị, giá trị tham chiếu. 

### **5.2. Cột** 

|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
|`id`|`bigint`|Có|generated|PK|Khóa chính|
|`item_code`|`varchar(80`<br>`)`|Có||Unique|Mã danh<br>mục/vật<br>tư/CCDC từ<br>Excel|
|`name`|`varchar(25`<br>`5)`|Có|||Tên danh mục|
|`category_i`<br>`d`|`bigint`|Không||FK -><br>`asset_cate`<br>`gories.id`|Nhóm tài<br>sản/CCDC|
|`catalog_ty`<br>`pe`|`varchar(40`<br>`)`|Có|||Loại danh<br>mục:`ASSET`,<br>`TOOL`,<br>`MATERIAL`,<br>`PRODUCT_RE`<br>`FERENCE`|
|`inventory_`<br>`group`|`varchar(12`<br>`0)`|Không|||Phân loại tồn<br>kho/phân<br>nhóm sản<br>phẩm từ Excel|
|`unit`|`varchar(40`<br>`)`|Không|||Đơn vị tính<br>chính, ví dụ<br>`CAI`,`BO`,`TAM`,<br>`CUON`|
|`cost_value `|`numeric(18`<br>`,2)`|Không|||Đơn giá<br>vốn/giá trị gốc<br>tham chiếu|
|`standard_v`<br>`alue`|`numeric(18`<br>`,2)`|Không|||Giá chuẩn nếu<br>có|
|`fixed_valu`<br>`e`|`numeric(18`<br>`,2)`|Không|||Giá cố định<br>nếu có|
|`internal_v`<br>`alue`|`numeric(18`<br>`,2)`|Không|||Giá nội bộ nếu<br>có|
|`technical_ `|`varchar(10`|Không|||Thông số hoặc|



|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
|`spec`|`00)`||||mô tả kỹ thuật<br>ngắn|
|`is_active`|`boolean`|Có|`true`||Còn sử dụng<br>hay không|
|`created_at `|`timestamp`|Có|`now()`||Thời điểm tạo|
|`updated_at `|`timestamp`|Có|`now()`||Thời điểm cập<br>nhật|



### **5.3. Ràng buộc đề xuất** 

|**Ràng buộc**|**Nội dung**|
|---|---|
|Unique|`item_code`|
|FK|`category_id`tham chiếu<br>`asset.asset_categories(id)`|
|Check|`catalog_type in ('ASSET',`<br>`'TOOL', 'MATERIAL',`<br>`'PRODUCT_REFERENCE')`|
|Index|`category_id`,`catalog_type`,`name`,<br>`is_active`|



## **6.** **`asset.assets`** 

### **6.1. Ý nghĩa** 

Bảng trung tâm của hệ thống QLVT. Mỗi dòng là một tài sản hoặc công cụ dụng cụ thực tế cần quản lý. 

Tài sản trong bảng này có thể: 

- Gắn QR để tra cứu bằng điện thoại. 

- Gán cho nhân viên, phòng ban, công trường, dự án. 

- Điều chuyển, bảo trì, thanh lý. 

- Theo dõi nguyên giá, khấu hao, giá trị sổ sách. 

- Liên kết tài sản cha/con. 

### **6.2. Cột** 

|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
|`id`|`bigint`|Có|generated|PK|Khóa chính|
|`asset_code `|`varchar(80`<br>`)`|Có||Unique|Mã tài sản thực<br>tế, dùng trên|



|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
||||||tem/QR/báo<br>cáo|
|`name`|`varchar(25`<br>`5)`|Có|||Tên tài sản|
|`catalog_it`<br>`em_id`|`bigint`|Không||FK -><br>`asset_cata`<br>`log_items.`<br>`id`|Danh mục gốc<br>nếu tạo từ danh<br>mục|
|`category_i`<br>`d`|`bigint`|Có||FK -><br>`asset_cate`<br>`gories.id`|Phân loại<br>chuẩn|
|`parent_ass`<br>`et_id`|`bigint`|Không||FK -><br>`assets.id`|Tài sản cha<br>nếu là tài sản<br>con|
|`asset_clas`<br>`s`|`varchar(40`<br>`)`|Có|||`FIXED_ASSE`<br>`T`hoặc<br>`TOOL_EQUIP`<br>`MENT`|
|`fixed_asse`<br>`t_type`|`varchar(40`<br>`)`|Không|||`TANGIBLE`,<br>`INTANGIBLE`<br>; chỉ dùng cho<br>TSCĐ|
|`tool_usage`<br>`_type`|`varchar(40`<br>`)`|Không|||`SINGLE_USE`<br>,`MULTI_USE`;<br>chỉ dùng cho<br>CCDC|
|`serial_num`<br>`ber`|`varchar(12`<br>`0)`|Không|||Số serial/seri<br>máy nếu có|
|`source`|`varchar(12`<br>`0)`|Không|||Nguồn hình<br>thành tài sản|
|`vendor_id`|`bigint`|Không||FK -><br>`vendors.id`|Nhà cung<br>cấp/đơn vị liên<br>quan|
|`assigned_e`<br>`mployee_id`|`bigint`|Không||External FK|Nhân viên<br>đang giữ/sử<br>dụng, tham<br>chiếu HRM|
|`department`<br>`_id`|`bigint`|Không||External FK|Phòng ban sử<br>dụng, tham<br>chiếu HRM|
|`site_id`|`bigint`|Không||External FK|Công<br>trường/địa<br>điểm sử dụng|
|`project_id `|`bigint`|Không||External FK|Dự án liên|



|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
||||||quan, tham<br>chiếu<br>CDS/project-<br>service|
|`purchase_d`<br>`ate`|`date`|Không|||Ngày mua<br>hoặc ngày ghi<br>nhận ban đầu|
|`use_date`|`date`|Không|||Ngày đưa vào<br>sử dụng|
|`depreciati`<br>`on_start_d`<br>`ate`|`date`|Không|||Ngày bắt đầu<br>khấu hao|
|`warranty_u`<br>`ntil`|`date`|Không|||Ngày hết bảo<br>hành|
|`original_c`<br>`ost`|`numeric(18`<br>`,2)`|Không|||Nguyên giá tài<br>sản|
|`purchase_c`<br>`ost`|`numeric(18`<br>`,2)`|Không|||Giá mua cũ để<br>tương thích<br>code hiện tại,<br>nên chuyển<br>dần sang<br>`original_c`<br>`ost`|
|`accumulate`<br>`d_deprecia`<br>`tion`|`numeric(18`<br>`,2)`|Có|`0`||Khấu hao lũy<br>kế|
|`book_value `|`numeric(18`<br>`,2)`|Không|||Giá trị theo sổ<br>sách|
|`residual_v`<br>`alue`|`numeric(18`<br>`,2)`|Không|||Giá trị còn<br>lại/giá trị thu<br>hồi dự kiến|
|`depreciati`<br>`on_method`|`varchar(40`<br>`)`|Không|`STRAIGHT_L`<br>`INE`||Phương pháp<br>khấu hao|
|`useful_lif`<br>`e_months`|`integer`|Không|||Thời gian khấu<br>hao theo tháng|
|`useful_lif`<br>`e_years`|`integer`|Không|||Trường cũ, giữ<br>tạm để tương<br>thích|
|`depreciati`<br>`on_rate`|`numeric(8,`<br>`4)`|Không|||Tỷ lệ khấu hao<br>nếu có từ Excel|
|`manufactur`<br>`e_year`|`integer`|Không|||Năm sản xuất|
|`installati`<br>`on_year`|`integer`|Không|||Năm lắp<br>đặt/cài đặt|



|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
|`country_co`<br>`de`|`varchar(10`<br>`)`|Không|||Mã quốc<br>gia/xuất xứ|
|`capacity`|`numeric(18`<br>`,4)`|Không|||Công suất thiết<br>kế|
|`capacity_u`<br>`nit`|`varchar(40`<br>`)`|Không|||Đơn vị công<br>suất|
|`real_capac`<br>`ity`|`numeric(18`<br>`,4)`|Không|||Công suất hiện<br>dùng/thực tế|
|`technical_`<br>`descriptio`<br>`n`|`varchar(20`<br>`00)`|Không|||Mô tả kỹ thuật|
|`status`|`varchar(30`<br>`)`|Có|`IN_STOCK`||Trạng thái tài<br>sản|
|`disposal_d`<br>`ate`|`date`|Không|||Ngày thanh lý|
|`disposal_p`<br>`rice`|`numeric(18`<br>`,2)`|Không|||Giá trị thanh lý|
|`disposal_r`<br>`eason`|`varchar(50`<br>`0)`|Không|||Lý do thanh lý|
|`notes`|`varchar(10`<br>`00)`|Không|||Ghi chú|
|`created_at `|`timestamp`|Có|`now()`||Thời điểm tạo|
|`updated_at `|`timestamp`|Có|`now()`||Thời điểm cập<br>nhật|



### **6.3. Ràng buộc đề xuất** 

|**Ràng buộc**|**Nội dung**|
|---|---|
|Unique|`asset_code`|
|FK|`catalog_item_id`tham chiếu<br>`asset.asset_catalog_items(id)`|
|FK|`category_id`tham chiếu<br>`asset.asset_categories(id)`|
|FK|`parent_asset_id`tham chiếu<br>`asset.assets(id)`|
|FK|`vendor_id`tham chiếu<br>`asset.vendors(id)`|
|Check|`asset_class in ('FIXED_ASSET',`<br>`'TOOL_EQUIPMENT')`|
|Check|Nếu`asset_class = 'FIXED_ASSET'`thì<br>`fixed_asset_type`không nên null|



|**Ràng buộc**|**Nội dung**|
|---|---|
|Check|Nếu`asset_class =`<br>`'TOOL_EQUIPMENT'`thì<br>`tool_usage_type`không nên null|
|Check|`original_cost >= 0`,<br>`accumulated_depreciation >= 0`,<br>`book_value >= 0`khi có giá trị|
|Index|`asset_code`,`name`,`category_id`,<br>`asset_class`,`status`,<br>`assigned_employee_id`,<br>`department_id`,`site_id`,`project_id`|



### **6.4. Ghi chú migration** 

|**Trường hiện tại**|**Hướng xử lý**|
|---|---|
|`category`|Tạo`asset_categories`, map dữ liệu cũ<br>sang`category_id`, sau đó bỏ hoặc giữ read-<br>only tạm thời|
|`purchase_cost`|Copy sang`original_cost`nếu<br>`original_cost`chưa có|
|`useful_life_years`|Chuyển sang`useful_life_months =`<br>`useful_life_years * 12`|
|`residual_value`|Giữ lại, nhưng không dùng thay cho<br>`book_value`|



## **7.** **`asset.asset_value_snapshots`** 

### **7.1. Ý nghĩa** 

Bảng lưu lịch sử giá trị tài sản theo từng thời điểm chốt. Bảng này giúp đối chiếu số liệu kế toán, import Excel theo kỳ, và truy vết biến động khấu hao. 

### **7.2. Cột** 

|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
|`id`|`bigint`|Có|generated|PK|Khóa chính|
|`asset_id`|`bigint`|Có||FK -><br>`assets.id`|Tài sản được<br>chốt giá trị|
|`snapshot_d`<br>`ate`|`date`|Có|||Ngày chốt giá<br>trị|
|`original_c`<br>`ost`|`numeric(18`<br>`,2)`|Có|||Nguyên giá tại<br>thời điểm chốt|
|`period_dep `|`numeric(18`|Có|`0`||Khấu hao phát|



|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
|`reciation`|`,2)`||||sinh trong kỳ|
|`accumulate`<br>`d_deprecia`<br>`tion`|`numeric(18`<br>`,2)`|Có|`0`||Khấu hao lũy<br>kế tới ngày<br>chốt|
|`book_value `|`numeric(18`<br>`,2)`|Có|||Giá trị còn lại<br>trên sổ|
|`source`|`varchar(80`<br>`)`|Có|`SYSTEM_CAL`<br>`CULATION`||Nguồn số liệu:<br>import, hệ<br>thống tính,<br>nhập tay|
|`notes`|`varchar(50`<br>`0)`|Không|||Ghi chú|
|`created_at `|`timestamp`|Có|`now()`||Thời điểm tạo|



### **7.3. Ràng buộc đề xuất** 

|**Ràng buộc**|**Nội dung**|
|---|---|
|Unique|`(asset_id, snapshot_date,`<br>`source)`|
|FK|`asset_id`tham chiếu`asset.assets(id)`|
|Check|Các giá trị tiền không âm|
|Index|`asset_id`,`snapshot_date`,`source`|



## **8.** **`asset.asset_documents`** 

### **8.1. Ý nghĩa** 

Bảng lưu metadata tài liệu đính kèm của tài sản. Tệp tin thực tế được lưu ở MinIO, database chỉ lưu `object_key` và thông tin phục vụ tra cứu. 

### **8.2. Cột** 

|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
|`id`|`bigint`|Có|generated|PK|Khóa chính|
|`asset_id`|`bigint`|Có||FK -><br>`assets.id`|Tài sản sở hữu<br>tài liệu|
|`document_t`<br>`ype`|`varchar(50`<br>`)`|Có|`OTHER`||Loại tài liệu|
|`file_name`|`varchar(25`<br>`5)`|Có|||Tên file gốc|
|`object_key `|`varchar(50`|Có||Unique|Key object|



|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
||`0)`||||trong MinIO|
|`content_ty`<br>`pe`|`varchar(12`<br>`0)`|Không|||MIME type|
|`size_bytes `|`bigint`|Không|||Dung lượng<br>file|
|`uploaded_b`<br>`y`|`varchar(20`<br>`0)`|Không|||Người upload|
|`created_at `|`timestamp`|Có|`now()`||Thời điểm<br>upload|



### **8.3. Ràng buộc đề xuất** 

|**Ràng buộc**|**Nội dung**|
|---|---|
|Unique|`object_key`|
|FK|`asset_id`tham chiếu`asset.assets(id)`|
|Check|`size_bytes >= 0`khi có giá trị|
|Index|`asset_id`,`document_type`,`created_at`|



## **9.** **`asset.asset_qr_codes`** 

### **9.1. Ý nghĩa** 

Bảng này không bắt buộc nếu QR chỉ sinh trực tiếp từ URL cố định của tài sản. Nên tạo bảng khi cần quản lý lịch sử in tem, thu hồi QR, token QR hoặc nhiều phiên bản QR cho cùng một tài sản. 

### **9.2. Cột** 

|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
|`id`|`bigint`|Có|generated|PK|Khóa chính|
|`asset_id`|`bigint`|Có||FK -><br>`assets.id`|Tài sản được<br>gắn QR|
|`qr_payload `|`varchar(10`<br>`00)`|Có|||Nội dung QR,<br>thường là URL<br>chi tiết tài sản|
|`qr_token`|`varchar(12`<br>`0)`|Không||Unique|Token ẩn id<br>nếu không<br>muốn lộ<br>`asset_id`<br>trên URL|
|`status`|`varchar(30`<br>`)`|Có|`ACTIVE`||Trạng thái QR|



|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
|`printed_at `|`timestamp`|Không|||Lần in gần<br>nhất|
|`printed_by `|`varchar(20`<br>`0)`|Không|||Người in gần<br>nhất|
|`created_at `<br>**9.3. Ràng bu**|`timestamp`<br>**ộc đề xuất**|Có|`now()`||Thời điểm tạo<br>QR metadata|
|**Ràng buộc**|||**Nội dung**|||
|FK|||`asset_id`th|am chiếu`asset`|`.assets(id)`|
|Unique|||`qr_token`nế|u dùng token||
|Check|||`status in`|`('ACTIVE', '`|`REVOKED')`|
|Index|||`asset_id`,`s`|`tatus`,`qr_tok`|`en`|



### **9.3. Ràng buộc đề xuất** 

## **10.** **`asset.asset_transfers`** 

### **10.1. Ý nghĩa** 

Bảng lưu lịch sử điều chuyển tài sản giữa nhân viên, phòng ban, công trường hoặc dự án. Đây là bảng lịch sử, không nên xóa khi tài sản đã chuyển nhiều lần. 

### **10.2. Cột** 

|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
|`id`|`bigint`|Có|generated|PK|Khóa chính|
|`transfer_header_id`|`bigint`|Không||FK -> `asset_transfer_headers.id`|Phiếu bàn giao chứa dòng tài sản|
|`line_no`|`integer`|Không|||Số thứ tự dòng trong phiếu|
|`line_status`|`varchar(30)`|Có|`COMPLETED`||Trạng thái xử lý dòng tài sản|
|`asset_id`|`bigint`|Có||FK -> `assets.id`|Tài sản được điều chuyển|
|`transfer_type`|`varchar(30)`|Có|||Loại điều chuyển|
|`transfer_date`|`date`|Có|||Ngày điều chuyển|
|`from_employee_id`, `to_employee_id`|`bigint`|Không||External FK|Nhân viên bàn giao/nhận|
|`from_department_id`, `to_department_id`|`bigint`|Không||External FK|Phòng ban bàn giao/nhận|
|`from_site_id`, `to_site_id`|`bigint`|Không||External FK|Địa điểm cũ/mới|
|`from_project_id`, `to_project_id`|`bigint`|Không||External FK|Dự án cũ/mới|
|`status_before`, `status_after`|`varchar(30)`|Không|||Trạng thái tài sản trước/sau bàn giao|
|`condition_before`, `condition_after`|`varchar(500)`|Không|||Tình trạng tài sản trước/sau bàn giao|
|`book_value_at_transfer`|`numeric(18,2)`|Không|||Giá trị còn lại tại thời điểm bàn giao|
|`reason`|`varchar(1000)`|Không|||Lý do điều chuyển|
|`receiver_note`|`varchar(1000)`|Không|||Ghi chú của bên nhận|
|`handover_document_url`|`varchar(500)`|Không|||URL/key biên bản cũ, giữ tương thích|
|`handover_document_id`|`bigint`|Không||FK -> `asset_documents.id`|Tài liệu bàn giao|
|`performed_by`|`varchar(200)`|Không|||Người thực hiện|
|`approved_by`|`varchar(200)`|Không|||Người duyệt|
|`created_at`|`timestamp`|Có|`now()`||Thời điểm tạo|



### **10.3. Ràng buộc đề xuất** 

|**Ràng buộc**|**Nội dung**|
|---|---|
|FK|`asset_id`tham chiếu`asset.assets(id)`|
|FK|`handover_document_id`tham chiếu<br>`asset.asset_documents(id)`|
|FK|`transfer_header_id` tham chiếu `asset.asset_transfer_headers(id)`|
|Check|`book_value_at_transfer >= 0` khi có giá trị|
|Index|`asset_id`, `transfer_header_id`, `line_status`, `transfer_date`, các cột nhân viên/phòng ban nguồn và đích|



## **11.** **`asset.maintenance_records`** 

### **11.1. Ý nghĩa** 

Bảng lưu lịch sử bảo trì, sửa chữa, kiểm định tài sản. Dùng chủ yếu cho tài sản hữu hình như máy móc, thiết bị, xe, công cụ dùng nhiều lần. 

### **11.2. Cột** 

|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
|`id`|`bigint`|Có|generated|PK|Khóa chính|
|`asset_id`|`bigint`|Có||FK -><br>`assets.id`|Tài sản được<br>bảo trì|
|`vendor_id`|`bigint`|Không||FK -><br>`vendors.id`|Đơn vị bảo<br>trì/sửa chữa|
|`maintenanc`<br>`e_type`|`varchar(30`<br>`)`|Có|||Loại bảo trì:<br>định kỳ, sửa<br>chữa, kiểm<br>định|
|`maintenanc`<br>`e_date`|`date`|Có|||Ngày bảo trì|
|`next_maint`<br>`enance_dat`<br>`e`|`date`|Không|||Ngày bảo trì<br>tiếp theo|
|`performed_`<br>`by`|`varchar(20`<br>`0)`|Không|||Người/đơn vị<br>thực hiện|
|`descriptio`<br>`n`|`varchar(10`<br>`00)`|Không|||Nội dung bảo<br>trì|
|`cost`|`numeric(18`<br>`,2)`|Không|||Chi phí bảo trì|
|`downtime_h`<br>`ours`|`numeric(10`<br>`,2)`|Không|||Thời gian dừng<br>máy|
|`meter_read`<br>`ing`|`numeric(18`<br>`,2)`|Không|||Chỉ số giờ<br>máy/km nếu có|
|`condition_`<br>`after`|`varchar(50`<br>`0)`|Không|||Tình trạng sau<br>bảo trì|
|`status`|`varchar(30`<br>`)`|Có|||Trạng thái<br>phiếu bảo trì|
|`created_at `|`timestamp`|Có|`now()`||Thời điểm tạo|
|`updated_at `|`timestamp`|Có|`now()`||Thời điểm cập<br>nhật|



### **11.3. Ràng buộc đề xuất** 

|**Ràng buộc**|**Nội dung**|
|---|---|
|FK|`asset_id`tham chiếu`asset.assets(id)`|
|FK|`vendor_id`tham chiếu<br>`asset.vendors(id)`|
|Check|`cost >= 0`,`downtime_hours >= 0`,<br>`meter_reading >= 0`khi có giá trị|
|Index|`asset_id`,`maintenance_date`,<br>`next_maintenance_date`,`status`,<br>`vendor_id`|



## **12.** **`asset.vendors`** 

### **12.1. Ý nghĩa** 

Bảng lưu nhà cung cấp, đơn vị bảo trì, đơn vị cung cấp phần mềm/license. Bảng này đang có trong schema hiện tại và nên giữ. 

### **12.2. Cột** 

|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
|`id`|`bigint`|Có|generated|PK|Khóa chính|
|`name`|`varchar(18`<br>`0)`|Có|||Tên nhà cung<br>cấp/đơn vị|
|`tax_code`|`varchar(80`<br>`)`|Không||Unique một<br>phần|Mã số thuế nếu<br>có|
|`contact_na`<br>`me`|`varchar(12`<br>`0)`|Không|||Người liên hệ|
|`phone`|`varchar(40`<br>`)`|Không|||Số điện thoại|
|`email`|`varchar(12`<br>`0)`|Không|||Email|
|`address`|`varchar(50`<br>`0)`|Không|||Địa chỉ|
|`website`|`varchar(255)`|Không|||Website nhà cung cấp|
|`bank_name`|`varchar(180)`|Không|||Tên ngân hàng|
|`bank_account_number`|`varchar(80)`|Không|||Số tài khoản ngân hàng|
|`status`|`varchar(20`<br>`)`|Có|`ACTIVE`||Trạng thái|
|`created_at `|`timestamp`|Có|`now()`||Thời điểm tạo|
|`updated_at `|`timestamp`|Có|`now()`||Thời điểm cập<br>nhật|



### **12.3. Ràng buộc đề xuất** 

|**Ràng buộc**|**Nội dung**|
|---|---|
|Unique|`tax_code`nếu không null|
|Index|`name`,`status`,`tax_code`|



## **13.** **`asset.subscriptions`** 

### **13.1. Ý nghĩa** 

Bảng quản lý phần mềm, license hoặc dịch vụ định kỳ. Nếu license được xem là tài sản vô hình thì nên tạo một dòng tương ứng trong `asset.assets` với `asset_class = 'FIXED_ASSET'` và `fixed_asset_type = 'INTANGIBLE'` , sau đó liên kết qua `asset_id` . 

### **13.2. Cột** 

|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
|`id`|`bigint`|Có|generated|PK|Khóa chính|
|`asset_id`|`bigint`|Không||FK -><br>`assets.id`|Tài sản vô hình<br>tương ứng|
|`vendor_id`|`bigint`|Không||FK -><br>`vendors.id`|Nhà cung cấp<br>license/dịch vụ|
|`software_n`<br>`ame`|`varchar(18`<br>`0)`|Có|||Tên phần<br>mềm/dịch vụ|
|`plan_name`|`varchar(12`<br>`0)`|Không|||Tên gói|
|`license_ke`<br>`y`|`varchar(50`<br>`0)`|Không|||Key/license<br>nếu được phép<br>lưu|
|`owner_empl`<br>`oyee_id`|`bigint`|Không||External FK|Nhân viên phụ<br>trách|
|`total_seat`<br>`s`|`integer`|Có|`0`||Tổng số<br>seat/license|
|`used_seats `|`integer`|Có|`0`||Số seat/license<br>đã dùng|
|`billing_cy`<br>`cle`|`varchar(20`<br>`)`|Không|||Chu kỳ thanh<br>toán|
|`cost`|`numeric(18`<br>`,2)`|Không|||Chi phí mỗi kỳ<br>hoặc chi phí<br>ghi nhận|
|`start_date `|`date`|Không|||Ngày bắt đầu|
|`renewal_da`<br>`te`|`date`|Không|||Ngày gia hạn|



|**Cột**|**Kiểu dữ liệu**|**Bắt buộc**|**Mặc định**|**Khóa**|**Ý nghĩa**|
|---|---|---|---|---|---|
|`status`|`varchar(30`<br>`)`|Có|`ACTIVE`||Trạng thái<br>subscription|
|`notes`|`varchar(50`<br>`0)`|Không|||Ghi chú|
|`created_at `|`timestamp`|Có|`now()`||Thời điểm tạo|
|`updated_at `|`timestamp`|Có|`now()`||Thời điểm cập<br>nhật|



### **13.3. Ràng buộc đề xuất** 

|**Ràng buộc**|**Nội dung**|
|---|---|
|FK|`asset_id`tham chiếu`asset.assets(id)`|
|FK|`vendor_id`tham chiếu<br>`asset.vendors(id)`|
|Check|`total_seats >= 0`,`used_seats >= 0`,<br>`used_seats <= total_seats`|
|Check|`cost >= 0`khi có giá trị|
|Index|`asset_id`,`vendor_id`,`software_name`,<br>`renewal_date`,`status`|



## **14. Bảng giữ sau, không thuộc lõi giai đoạn đầu** 

Các bảng hiện tại như `asset.purchase_requests` và `asset.contracts` có thể giữ nếu hệ thống vẫn cần quy trình mua sắm/hợp đồng. Tuy nhiên, theo phạm vi hiện tại là quản lý tài sản, hai bảng này không phải lõi schema cải tiến. 

### **14.1.** **`asset.purchase_requests`** 

|**Hướng xử lý**|**Ghi chú**|
|---|---|
|Giữ nguyên nếu cần quy trình đề xuất mua sắm|Không bắt buộc cho chức năng quản lý tài<br>sản/QR/kiểm kê|
|Không import các cột Excel liên quan mua hàng<br>vào đây trong giai đoạn đầu|Tránh làm rộng phạm vi|



### **14.2.** **`asset.contracts`** 

|**Hướng xử lý**|**Ghi chú**|
|---|---|
|Giữ nguyên nếu cần quản lý hợp đồng mua/bảo|Có thể liên kết với`vendors`,`assets`,|
|trì|`asset_documents`sau|
|Không dùng thay thế`asset_documents`|Hợp đồng là nghiệp vụ riêng, còn tài liệu đính|



|**Hướng xử lý**|**Ghi chú**|
|---|---|
||kèm tài sản nên có bảng riêng|



## **15. Các bảng bổ sung từ V4-V8**

### **15.1. `asset.asset_booking_sessions`**

Lưu lịch đặt mượn/sử dụng tài sản. Các cột gồm `id`, `asset_id`, `booking_code`, `title`, `purpose`, `start_time`, `end_time`, `requested_by_employee_id`, `department_id`, `site_id`, `project_id`, `status`, `auto_release`, `checked_in_at`, `checked_out_at`, `approved_by`, `cancelled_by`, `cancelled_at`, `cancel_reason`, `notes`, `created_by`, `updated_by`, `created_at`, `updated_at`.

|**Ràng buộc**|**Nội dung**|
|---|---|
|FK|`asset_id` tham chiếu `asset.assets(id)`|
|Unique|`booking_code`|
|Check|`end_time > start_time`|
|Exclude (V5)|Cùng `asset_id` không được chồng khoảng `[start_time, end_time)` khi trạng thái là `CONFIRMED` hoặc `IN_USE`|

### **15.2. `asset.asset_transfer_headers`**

Lưu thông tin chung của phiếu bàn giao. Các cột gồm `id`, `transfer_code`, `title`, `transfer_type`, `status`, `requested_by`, `requested_employee_id`, `approved_by`, `completed_by`, `cancelled_by`, các cặp nguồn/đích `employee_id`, `department_id`, `site_id`, `project_id`, `transfer_date`, `planned_handover_at`, `completed_at`, `cancelled_at`, `cancel_reason`, `reason`, `note`, `created_at`, `updated_at`.

`transfer_code` là duy nhất. `status` và `transfer_type` có check constraint theo tập giá trị nghiệp vụ trong V7.

### **15.3. `asset.asset_transfer_documents`**

Lưu tài liệu của phiếu bàn giao với các cột `id`, `transfer_header_id`, `document_type`, `document_status`, `file_name`, `object_key`, `content_type`, `size_bytes`, `uploaded_by`, `created_at`. `transfer_header_id` tham chiếu `asset_transfer_headers(id)` và xóa cascade; `object_key` là duy nhất.

### **15.4. `asset.asset_transfer_confirmations`**

Lưu xác nhận/chữ ký của các bên với các cột `id`, `transfer_header_id`, `confirmation_role`, `confirmer_employee_id`, `confirmer_username`, `confirmer_name`, `status`, `signature_method`, `signature_document_id`, `confirmed_at`, `note`, `created_at`, `updated_at`.

`transfer_header_id` tham chiếu `asset_transfer_headers(id)` và xóa cascade; `signature_document_id` tham chiếu `asset_transfer_documents(id)`. Mỗi phiếu chỉ có một xác nhận cho mỗi tổ hợp vai trò, nhân viên và username người xác nhận.

### **15.5. `asset.audit_logs`**

Lưu nhật ký bất biến của thao tác nghiệp vụ với các cột `id`, `occurred_at`, thông tin actor (`actor_employee_id`, `actor_username`, `actor_role`), đối tượng (`module`, `entity_type`, `entity_id`, `entity_code`), hành động (`action`, `severity`, `summary`), dữ liệu JSONB (`before_data`, `after_data`, `changed_fields`) và thông tin request (`request_id`, `ip_address`, `user_agent`).

`severity` chỉ nhận `INFO`, `WARNING`, `CRITICAL`; `changed_fields` có GIN index để truy vấn JSONB.

### **15.6. `asset.audit_log_definitions`**

Danh mục định nghĩa hành động audit gồm `id`, `module`, `entity_type`, `action`, `display_name`, `description`, `default_severity`, `is_active`, `sort_order`, `created_at`, `updated_at`. Bộ ba `(module, entity_type, action)` là duy nhất; `default_severity` nhận `INFO` hoặc `WARNING`.


## **16. Lịch sử Flyway migration** 

|**Phiên bản**|**Cập nhật chính**|
|---|---|
|`V1`|Khởi tạo lược đồ nền của asset-service.|
|`V2`|Tạo `consumer_event_offsets` phục vụ xử lý event.|
|`V3`|Refactor lược đồ QLVT: danh mục, tài sản, giá trị, tài liệu, QR, điều chuyển, bảo trì, nhà cung cấp, subscription, đề nghị mua và hợp đồng.|
|`V4`|Tạo `asset_booking_sessions`.|
|`V5`|Thêm ràng buộc GiST ngăn lịch `CONFIRMED`/`IN_USE` của cùng tài sản bị chồng thời gian.|
|`V6`|Tạo `audit_logs`.|
|`V7`|Mở rộng quy trình bàn giao: tạo header, document, confirmation và bổ sung thông tin dòng bàn giao.|
|`V8`|Tạo `audit_log_definitions` và dữ liệu định nghĩa audit ban đầu.|
|`V9`|Backfill họ tên người duyệt/từ chối từ audit log; không thay đổi cấu trúc bảng.|
|`V10`|Bổ sung `website`, `bank_name`, `bank_account_number` cho `vendors`.|

## **17. Ghi chú triển khai API/frontend** 

|**Khu vực**|**Thay đổi cần làm**|
|---|---|
|API tạo/sửa tài sản|Nhận thêm`categoryId`,`assetClass`,<br>`fixedAssetType`,`toolUsageType`,<br>`originalCost`,`bookValue`,`useDate`,<br>`depreciationStartDate`|
|API danh mục|Thêm CRUD/import cho<br>`asset_categories`và<br>`asset_catalog_items`|
|API sinh mã tài sản|Dùng`asset_code_sequences`để cấp mã<br>tăng dần theo`category_id`trong transaction|
|API QR|Sinh QR từ URL ổn định hoặc token; chỉ lưu<br>`asset_qr_codes`nếu cần lịch sử|
|API file|Upload file vào MinIO, lưu metadata vào<br>`asset_documents`|
|Frontend tài sản|Form cần tách rõ TSCĐ/CCDC, hữu hình/vô<br>hình, dùng một lần/dùng nhiều lần|
|Frontend báo cáo|Dùng`asset_value_snapshots`nếu cần<br>báo cáo theo kỳ|



## **18. Kết luận** 

Lược đồ sau cải tiến tách rõ 3 lớp dữ liệu: 

1. Phân loại và danh mục chuẩn. 

2. Tài sản/CCDC thực tế. 

3. Lịch sử, tài liệu, QR, điều chuyển, bảo trì. 

Cách tách này giúp hệ thống QLVT quản lý đúng nghiệp vụ tài sản, đồng thời vẫn đủ linh hoạt để import dữ liệu từ Excel, xuất tem QR, kiểm kê, điều chuyển, bảo trì, thanh lý và báo cáo giá trị tài sản. 
