import type { ReactNode } from "react";
import { AuthContext, type AuthContextProps } from "react-oidc-context";

/**
 * Creates a mock authentication object for testing purposes.
 * @param override An optional object to override the default authentication state.
 * @returns An object representing the authentication state, with the ability to override default values.
 */
const mockUseAuth = (override = {}) => ({
  isAuthenticated: false,
  ...override,
});

/**
 * Props for the AuthWrapper component.
 */
interface WrapperProps {
  authState: { isAuthenticated: boolean };
  children: ReactNode;
}

/**
 * AuthWrapper is a helper component that wraps the tested component with the necessary authentication
 * context. It accepts an authState prop to set the authentication state for testing purposes.
 * @param {boolean} isAuthenticated A boolean indicating whether the user is authenticated or not.
 * @param {ReactNode} props.children The child components that will be wrapped by the AuthWrapper.
 * @returns {JSX.Element} A React component that provides the authentication context to its children.
 */
export const AuthWrapper: React.FC<WrapperProps> = ({
  authState,
  children,
}: WrapperProps) => (
  <AuthContext.Provider value={mockUseAuth(authState) as AuthContextProps}>
    {children}
  </AuthContext.Provider>
);
