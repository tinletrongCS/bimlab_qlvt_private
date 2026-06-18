# BIMLab Asset Management / QLVT


## Service

- `asset-service`: Spring Boot Java microservice.
- Port nội bộ: `8086`.
- DB schema: `asset`.
- Auth: dùng JWT do HRM `auth-service` phát hành, cùng `JWT_SECRET`/`RSA_PUBLIC_KEY`.
- Gateway route: `/api/asset/**`.
- Frontend local: `http://localhost:3002`.

## API Base

- `GET /api/asset/dashboard`
- `GET/POST/PUT/DELETE /api/asset/vendors`
- `GET/POST/PUT/DELETE /api/asset/assets`
- `GET/POST/PUT/DELETE /api/asset/subscriptions`
- `GET/POST/PUT/DELETE /api/asset/purchase-requests`
- `PATCH /api/asset/purchase-requests/{id}/status`

## Phase Sau

- Add role/permissions HRM: `FINANCE`, `asset_*`, `subscription_*`, `purchase_request_*`, `vendor_*`.
- Add license seats, asset assignment history, QR code, import Excel.
- Add contract/invoice/payment milestones.
- Add email renewal alerts.
- Add frontend ReactTS.

## Local dev (chạy cả stack)

Repo này KHÔNG chạy độc lập — cần `platform_bimlab` (keycloak/gateway) + `bimlab_hrm`
(postgres/minio/auth) trên cùng network `bimlab-net`. Clone 6 repo cạnh nhau rồi:

```bash
cp platform_bimlab/dev/.env.shared.example .env.shared   # ở workspace cha, điền secret
platform_bimlab/dev/dev-up.sh                            # platform → HRM → CDS → QLVT → EduBIM
```
Chi tiết + bảng cổng/health: **`platform_bimlab/DEV-STACK.md`**.

## Database migration

`asset-service` owns schema `asset` through Flyway migrations in
`asset-service/src/main/resources/db/migration`.

- Production/staging: deploy the new `asset-service` image and let Flyway run
  `V3__qlvt_asset_schema_refactor.sql` on startup. Do not run
  `init_qlvt_asset_schema.sql` against production because it drops
  `asset` schema and all data.
- Local/dev reset only: `asset-service/src/main/resources/db/init_qlvt_asset_schema.sql`
  can recreate the schema from scratch when data loss is acceptable.
- After backend entities/DTOs are fully aligned with the refactored schema, set
  `SPRING_JPA_HIBERNATE_DDL_AUTO=validate` in deployed environments.
