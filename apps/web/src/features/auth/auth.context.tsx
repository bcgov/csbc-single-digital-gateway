import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../../api/api.client";
import type { AuthState, IdpType, UserProfile } from "./auth.types";

const BcscAuthContext = createContext<AuthState | null>(null);
const IdirAuthContext = createContext<AuthState | null>(null);

interface AuthProviderProps {
  idpType: IdpType;
  defaultRedirectPath: string;
  lazy?: boolean;
  children: ReactNode;
}

export const AuthProvider = ({
  idpType,
  defaultRedirectPath,
  lazy = false,
  children,
}: AuthProviderProps) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(!lazy);

  useEffect(() => {
    if (lazy) return;

    api
      .get<UserProfile>(`/auth/${idpType}/me`)
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, [idpType, lazy]);

  const login = useCallback(
    (returnTo?: string) => {
      const target =
        returnTo ?? `${window.location.origin}${defaultRedirectPath}`;
      window.location.href = `${import.meta.env.VITE_AUTH_URL}/auth/${idpType}/login?returnTo=${encodeURIComponent(target)}`;
    },
    [idpType, defaultRedirectPath],
  );

  const logout = useCallback(async () => {
    try {
      const { data } = await api.post<{ logoutUrl: string | null }>(
        `/auth/${idpType}/logout`,
      );
      if (data.logoutUrl) {
        window.location.href = data.logoutUrl;
      } else {
        window.location.href = "/";
      }
    } catch {
      window.location.href = "/";
    }
  }, [idpType]);

  const value = useMemo<AuthState>(
    () => ({
      isAuthenticated: user !== null,
      isLoading,
      user,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  const Context = idpType === "bcsc" ? BcscAuthContext : IdirAuthContext;

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useBcscAuth = (): AuthState => {
  const context = useContext(BcscAuthContext);
  if (!context) {
    throw new Error("useBcscAuth must be used within a BCSC AuthProvider");
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useIdirAuth = (): AuthState => {
  const context = useContext(IdirAuthContext);
  if (!context) {
    throw new Error("useIdirAuth must be used within an IDIR AuthProvider");
  }
  return context;
};

/** @deprecated Use useBcscAuth() instead */
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = useBcscAuth;
