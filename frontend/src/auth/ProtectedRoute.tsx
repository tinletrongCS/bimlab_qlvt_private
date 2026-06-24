import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { useAuth } from "../contexts/AuthContext";
import type { Permission } from "../services/types";

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: Permission;
}

export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const { user, bootstrapping, hasPermission } = useAuth();
  const location = useLocation();

  if (bootstrapping) {
    return <LoadingSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
