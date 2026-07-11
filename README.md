# BIMLab QLVT

Hệ thống quản lý vật tư và tài sản của BIMLab. Ứng dụng quản lý tài sản, nhà cung cấp, hợp đồng, yêu cầu mua sắm, điều chuyển và các dữ liệu tài chính liên quan.

## Thành phần

| Thư mục | Chức năng |
| --- | --- |
| `frontend/` | Giao diện quản lý vật tư và tài sản |
| `asset-service/` | API nghiệp vụ, phân quyền và truy cập dữ liệu |
| `documents/` | Tài liệu và mẫu dữ liệu phục vụ import |
| `scripts/` | Công cụ kiểm tra và hỗ trợ vận hành |

Backend dùng Spring Boot 3, Java 17 và PostgreSQL. Frontend dùng React, TypeScript và Vite. File đính kèm được lưu qua MinIO.

## Chạy môi trường local

QLVT dùng chung Keycloak, gateway, PostgreSQL và network với platform và HRM. Các repo cần được clone cùng cấp.

```bash
platform_bimlab/dev/dev-up.sh
```

Địa chỉ frontend mặc định: `http://localhost:3002`.

Chi tiết cấu hình local stack nằm trong `platform_bimlab/DEV-STACK.md`.

## Phát triển và kiểm tra

Frontend:

```bash
cd frontend
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm test:coverage
corepack pnpm build
```

Backend:

```bash
cd asset-service
./mvnw verify
```

Kiểm tra Docker Compose:

```bash
docker compose --env-file ../.env.shared config --quiet
```

## Database

`asset-service` quản lý schema `asset` bằng Flyway trong `asset-service/src/main/resources/db/migration`.

File `init_qlvt_asset_schema.sql` chỉ dùng để reset dữ liệu local. Không chạy file này trên staging hoặc production vì script tạo lại toàn bộ schema.

## Cấu hình

- `.env.example` mô tả các biến môi trường của repo.
- `.env.shared` chỉ dùng cho local stack và không được commit.
- Thông tin kết nối database, Keycloak và MinIO được cấp từ môi trường chạy.

## Tài liệu

- `docs/ARCHITECTURE.md`: kiến trúc hệ thống
- `docs/decisions/`: quyết định kỹ thuật
- `docs/TEST_MATRIX.md`: phạm vi kiểm thử
- `docs/product/`: tài liệu nghiệp vụ
