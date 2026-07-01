/**
 * Auth as TanStack Query for citizen-portal-web (mirrors platform-web feature 31). Wraps the BFF
 * `getMe()` (feature 27) so the authenticated landing can render the signed-in citizen (`useAuth`)
 * and, later, guard routes via `ensureQueryData(authQueryOptions())`.
 */
import { queryOptions, useQuery } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import { getMe, loginUrlFor } from '@/lib/bff';

/** The shared query for the current user — `['auth','me']`, resolving to `AuthUser | null`. */
export function authQueryOptions() {
  return queryOptions({
    queryKey: ['auth', 'me'] as const,
    queryFn: getMe,
    staleTime: 5 * 60 * 1000,
  });
}

/** Subscribe to the current user inside a component. */
export function useAuth() {
  return useQuery(authQueryOptions());
}

/**
 * The BFF login URL that returns the browser to the current page after login (feature 67).
 * Use for "Log in" affordances so a citizen lands back where they started.
 */
export function useLoginUrl(): string {
  const location = useLocation();
  return loginUrlFor(location.href);
}

/** Avatar text: the first letters of the first two words, uppercased (`"Amina Ali" → "AA"`). */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

/** Greeting label: just the first name token (`"Amina Ali" → "Amina"`). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/).find(Boolean) ?? name;
}
