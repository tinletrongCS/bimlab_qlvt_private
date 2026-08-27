import { createContext, type ReactNode, useContext, useState } from "react";

export interface NavGuardConfig {
  isDirty: boolean;
  message?: string;
  countLabel?: string;
  onConfirm?: () => void;
}

interface NavigationGuardContextType {
  guard: NavGuardConfig | null;
  setGuard: (guard: NavGuardConfig | null) => void;
}

const NavigationGuardContext = createContext<NavigationGuardContextType>({
  guard: null,
  setGuard: () => {},
});

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const [guard, setGuard] = useState<NavGuardConfig | null>(null);

  return (
    <NavigationGuardContext.Provider value={{ guard, setGuard }}>
      {children}
    </NavigationGuardContext.Provider>
  );
}

export function useNavigationGuard() {
  return useContext(NavigationGuardContext);
}
