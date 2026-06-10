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
