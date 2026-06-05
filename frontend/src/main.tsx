import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/app.css";

// oidc-client-ts silent-renew (prompt=none) load lại SPA này trong IFRAME ẩn tại redirect_uri.
// Trong iframe chỉ relay kết quả (?state + code|error) về tab cha rồi DỪNG — KHÔNG render app
// (render thì iframe không postMessage về cha → cha timeout ~10s → mất phiên). Guard self!==top
// nên tab chính KHÔNG bị ảnh hưởng; dynamic import để legacy bundle không kéo oidc-client-ts.
const sp = new URLSearchParams(window.location.search);
const isSilentRenewIframe =
  window.self !== window.top && sp.has("state") && (sp.has("code") || sp.has("error"));

if (isSilentRenewIframe) {
  import("./auth/oidc").then((m) => m.completeSilentRenewCallback()).catch(() => {});
} else {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
