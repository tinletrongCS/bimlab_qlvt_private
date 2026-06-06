FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10.33.2
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Phase 2 — Keycloak SSO build-time switch. Default legacy = build cũ KHÔNG đổi hành vi.
# Build bản keycloak:
#   docker build --build-arg VITE_AUTH_MODE=keycloak --build-arg VITE_KEYCLOAK_REDIRECT_URI=http://localhost:5174/ ...
ARG VITE_AUTH_MODE=legacy
ARG VITE_KEYCLOAK_AUTHORITY=http://localhost:8081/realms/bimlab
ARG VITE_KEYCLOAK_CLIENT_ID=qlvt
ARG VITE_KEYCLOAK_REDIRECT_URI=http://localhost:5174/
RUN printf 'VITE_AUTH_MODE=%s\nVITE_KEYCLOAK_AUTHORITY=%s\nVITE_KEYCLOAK_CLIENT_ID=%s\nVITE_KEYCLOAK_REDIRECT_URI=%s\n' \
    "$VITE_AUTH_MODE" "$VITE_KEYCLOAK_AUTHORITY" "$VITE_KEYCLOAK_CLIENT_ID" "$VITE_KEYCLOAK_REDIRECT_URI" > .env.production.local
RUN pnpm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
