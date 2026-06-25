import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ToastBar, Toaster, toast } from "react-hot-toast";
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
      <Toaster position="top-right" gutter={8} toastOptions={{ duration: 4000 }}>
        {(t) => (
          <ToastBar
            toast={t}
            style={{
              padding: 0,
              background: "transparent",
              boxShadow: "none",
              maxWidth: 400,
            }}
          >
            {({ icon, message }) => (
              <div
                onClick={() => toast.dismiss(t.id)}
                title="Click để đóng"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 1px 6px rgba(0,0,0,0.04)",
                  cursor: "pointer",
                  minWidth: "260px",
                  maxWidth: "380px",
                  border: "1px solid #e5e7eb",
                  userSelect: "none",
                }}
              >
                <span style={{ flexShrink: 0 }}>{icon}</span>
                <span
                  style={{
                    flex: 1,
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#1f2937",
                    lineHeight: "1.4",
                  }}
                >
                  {message}
                </span>
              </div>
            )}
          </ToastBar>
        )}
      </Toaster>
      <App />
    </StrictMode>,
  );
}
