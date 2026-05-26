import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { login as apiLogin, logout as apiLogout, loadCurrentUser } from "../services/api";
import type { AuthUser, Permission } from "../services/types";

interface AuthContextValue {
  user: AuthUser | null;
  bootstrapping: boolean;
  loginError: string;
  submitting: boolean;
  login: (username: string, password: string) => Promise<boolean>;
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
    loadCurrentUser()
      .then((current) => {
        if (!cancelled) setUser(current);
      })
      .catch(() => {
        // No active session — fall through to login screen.
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setSubmitting(true);
    setLoginError("");
    try {
      const loginUser = await apiLogin(username, password);
      setUser(loginUser);
      return true;
    } catch (err) {
      setLoginError(readError(err));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setSubmitting(true);
    try {
      await apiLogout();
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
