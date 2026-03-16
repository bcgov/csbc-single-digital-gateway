import type { ReactNode } from "react";
import { AuthContext, type AuthContextProps } from "react-oidc-context";

// Create a mock hook return value
const mockUseAuth = (override = {}) => ({
  isAuthenticated: false,
  ...override,
});

interface WrapperProps {
  authState: { isAuthenticated: boolean };
  children: ReactNode;
}

export const AuthWrapper: React.FC<WrapperProps> = ({
  authState,
  children,
}: WrapperProps) => (
  <AuthContext.Provider value={mockUseAuth(authState) as AuthContextProps}>
    {children}
  </AuthContext.Provider>
);
