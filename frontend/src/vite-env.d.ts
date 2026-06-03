/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Phase 2 PR#5 — Keycloak SSO (xem src/auth/authMode.ts). Mặc định = legacy.
  readonly VITE_AUTH_MODE?: "legacy" | "keycloak";
  readonly VITE_KEYCLOAK_AUTHORITY?: string;
  readonly VITE_KEYCLOAK_CLIENT_ID?: string;
  readonly VITE_KEYCLOAK_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
