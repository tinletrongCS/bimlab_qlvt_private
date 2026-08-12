/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Keycloak SSO (xem src/auth/authMode.ts). KC là chế độ auth duy nhất.
  readonly VITE_AUTH_MODE?: "keycloak";
  readonly VITE_KEYCLOAK_AUTHORITY?: string;
  readonly VITE_KEYCLOAK_CLIENT_ID?: string;
  readonly VITE_KEYCLOAK_REDIRECT_URI?: string;
  readonly VITE_ASSET_QR_PUBLIC_PAGE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
