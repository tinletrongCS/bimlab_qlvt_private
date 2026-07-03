import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
        onSessionLost(() => {
          if (!cancelled) setUser(null);
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
    try {
      await keycloakLogout();
    } catch {
      // Token may already be expired; local logout still valid.
    } finally {
      setUser(null);
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
