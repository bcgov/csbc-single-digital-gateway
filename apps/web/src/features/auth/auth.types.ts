export type IdpType = "bcsc" | "idir";

export interface UserProfile {
  sub: string;
  name?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  roles?: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  login: (returnTo?: string) => void;
  logout: () => Promise<void>;
}
