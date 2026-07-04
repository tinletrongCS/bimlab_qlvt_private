import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import toast from "react-hot-toast";
import {
  handleOidcCallback,
  isOidcCallback,
  keycloakLogin,
  keycloakLogout,
  onSessionLost,
  trySilentLogin,
} from "../auth/oidc";
import { loadCurrentUser } from "../services/api";
import type { AuthUser, Permission } from "../services/types";

interface AuthContextValue {
  user: AuthUser | null;
  bootstrapping: boolean;
  loginError: string;
  submitting: boolean;
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (permission?: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        // PR#6: refresh token rotation thất bại / token hết hạn → mất phiên → logout UI (về /login).
        // Toast cho user biết lý do (đăng xuất từ app khác qua SLO, hoặc hết hạn) thay vì văng im lặng.
        onSessionLost((reason) => {
          if (!cancelled) {
            setUser(null);
            toast.error(
              reason === "signed-out"
                ? "Bạn đã đăng xuất khỏi hệ thống."
                : "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
              { duration: 5000, id: "session-lost" },
            );
          }
        });
        // Keycloak: nếu là callback → đổi code→token; nếu không → thử khôi phục phiên (prompt=none).
        let hasSession = false;
        if (isOidcCallback()) {
          hasSession = await handleOidcCallback();
        } else {
          hasSession = await trySilentLogin();
        }

        if (!hasSession) {
          await keycloakLogin();
          return;
        }

        // loadCurrentUser → /asset/me (Bearer in-memory).
        const current = await loadCurrentUser();
        if (!cancelled) setUser(current);
      } catch {
        // No active session — fall through to login screen.
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (): Promise<boolean> => {
    // Keycloak: redirect sang trang login Keycloak (Authorization Code + PKCE). Trang điều hướng đi.
    setSubmitting(true);
    setLoginError("");
    try {
      await keycloakLogin();
      return true;
    } catch (err) {
      setLoginError(readError(err));
      setSubmitting(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setSubmitting(true);
    setUser(null);
    try {
      await keycloakLogout();
    } catch {
      // Token may already be expired; local logout still valid.
    } finally {
      setSubmitting(false);
    }
  }, []);

  const hasPermission = useCallback(
    (permission?: Permission) => {
      if (!permission) return true;
      if (user?.role === "ADMIN") return true;
      return Boolean(user?.permissions?.includes(permission));
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, bootstrapping, loginError, submitting, login, logout, hasPermission }),
    [user, bootstrapping, loginError, submitting, login, logout, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

function readError(error: unknown): string {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || "Không thể xử lý yêu cầu";
  }
  return "Không thể xử lý yêu cầu";
}
