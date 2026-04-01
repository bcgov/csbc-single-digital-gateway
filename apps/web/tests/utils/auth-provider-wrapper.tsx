import { createContext } from "react";
import {
  AuthProvider,
  type AuthProviderProps,
} from "src/features/auth/auth.context";
import type { AuthState } from "src/features/auth/auth.types";

interface AuthProviderWrapperProps {
  authState: AuthState;
  authProvider: AuthProviderProps;
}

/**
 * Creates a mock authentication object for testing purposes.
 * @param override An optional object to override the default authentication state.
 * @returns An object representing the authentication state, with the ability to override default values.
 */
const mockAuthState = (override = {}) => ({
  isAuthenticated: false,
  isLoading: false,
  user: null,
  login: () => {},
  logout: () => Promise.resolve(),
  ...override,
});

/**
 * AuthProviderWrapper is a higher-order component that provides a mock authentication context for testing
 * components that rely on authentication. It accepts an authState object to set the desired authentication state
 * and an authProvider object to provide the necessary props for the AuthProvider component. This allows tests to
 * simulate different authentication scenarios without needing to perform actual authentication.
 * @param authState The authentication state to be provided to the context.
 * @param authProvider The props to be passed to the AuthProvider component.
 * @returns A React component that wraps its children with a mock authentication context for testing purposes.
 */
export const AuthProviderWrapper: React.FC<AuthProviderWrapperProps> = ({
  authState,
  authProvider,
}: AuthProviderWrapperProps) => {
  const Context = createContext<AuthState | null>(null);
  return (
    <Context.Provider value={mockAuthState(authState)}>
      <AuthProvider {...authProvider}>{authProvider?.children}</AuthProvider>
    </Context.Provider>
  );
};
