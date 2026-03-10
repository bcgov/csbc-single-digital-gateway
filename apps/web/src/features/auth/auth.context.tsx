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
import type { AuthState, UserProfile } from "./auth.types";

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<UserProfile>("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback((returnTo?: string) => {
    const target = returnTo ?? `${window.location.origin}/app`;
    window.location.href = `${import.meta.env.VITE_AUTH_URL}/auth/login?returnTo=${encodeURIComponent(target)}`;
  }, []);

  const logout = useCallback(async () => {
    try {
      const { data } = await api.post<{ logoutUrl: string | null }>(
        "/auth/logout",
      );
      if (data.logoutUrl) {
        window.location.href = data.logoutUrl;
      } else {
        window.location.href = "/";
      }
    } catch {
      window.location.href = "/";
    }
  }, []);

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
