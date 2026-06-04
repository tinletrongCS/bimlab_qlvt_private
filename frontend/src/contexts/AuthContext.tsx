import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isKeycloak } from "../auth/authMode";
import {
  handleOidcCallback,
  isOidcCallback,
  keycloakLogin,
  keycloakLogout,
  onSessionLost,
  trySilentLogin,
} from "../auth/oidc";
import {
  login as apiLogin,
  logout as apiLogout,
  verifyMfaLogin as apiVerifyMfaLogin,
  loadCurrentUser,
} from "../services/api";
import type { AuthLoginResponse, AuthUser, Permission } from "../services/types";

interface AuthContextValue {
  user: AuthUser | null;
  bootstrapping: boolean;
  loginError: string;
  submitting: boolean;
  login: (
    username: string,
    password: string,
  ) => Promise<{ user?: AuthUser; mfaRequired?: boolean; challengeId?: string; message?: string }>;
  verifyMfaLogin: (challengeId: string, code: string, backupCode?: string) => Promise<AuthUser>;
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
        if (isKeycloak) {
          // PR#6: refresh token rotation thất bại / token hết hạn → mất phiên → logout UI (về /login).
          onSessionLost(() => {
            if (!cancelled) setUser(null);
          });
          // Keycloak: nếu là callback → đổi code→token; nếu không → thử khôi phục phiên (prompt=none).
          if (isOidcCallback()) {
            await handleOidcCallback();
          } else {
            await trySilentLogin();
          }
        }
        // loadCurrentUser: legacy → /auth/me (cookie); keycloak → /asset/me (Bearer in-memory).
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

  const login = useCallback(
    async (
      username: string,
      password: string,
    ): Promise<{
      user?: AuthUser;
      mfaRequired?: boolean;
      challengeId?: string;
      message?: string;
    }> => {
      if (isKeycloak) {
        // Keycloak: redirect sang trang login Keycloak (username/password bỏ qua — KC xử lý). Trang điều hướng đi.
        setSubmitting(true);
        setLoginError("");
        try {
          await keycloakLogin();
          return {};
        } catch (err) {
          setLoginError(readError(err));
          setSubmitting(false);
          return {};
        }
      }
      setSubmitting(true);
      setLoginError("");
      try {
        const response = await apiLogin(username, password);
        if (response.mfaRequired) {
          return {
            mfaRequired: true,
            challengeId: response.mfaChallengeId,
            message: response.message,
          };
        }
        const loginUser = mapAuthUser(response);
        setUser(loginUser);
        return { user: loginUser };
      } catch (err) {
        setLoginError(readError(err));
        return {};
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const verifyMfaLogin = useCallback(
    async (challengeId: string, code: string, backupCode?: string): Promise<AuthUser> => {
      setSubmitting(true);
      setLoginError("");
      try {
        const response = await apiVerifyMfaLogin(challengeId, code, backupCode);
        const loginUser = mapAuthUser(response);
        setUser(loginUser);
        return loginUser;
      } catch (err) {
        setLoginError(readError(err));
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    setSubmitting(true);
    try {
      if (isKeycloak) {
        await keycloakLogout();
      } else {
        await apiLogout();
      }
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
    () => ({
      user,
      bootstrapping,
      loginError,
      submitting,
      login,
      verifyMfaLogin,
      logout,
      hasPermission,
    }),
    [user, bootstrapping, loginError, submitting, login, verifyMfaLogin, logout, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

function mapAuthUser(response: AuthLoginResponse): AuthUser {
  return {
    id: response.id,
    username: response.username || "",
    role: response.role || "",
    fullName: response.fullName,
    permissions: response.permissions,
    mfaEnabled: response.mfaEnabled,
  };
}

function readError(error: unknown): string {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || "Không thể xử lý yêu cầu";
  }
  return "Không thể xử lý yêu cầu";
}
