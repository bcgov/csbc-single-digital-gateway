/**
 * Auth as TanStack Query (feature 31). Wraps the BFF `getMe()` (feature 27) so the console can both
 * render the signed-in user (`useAuth`) and guard routes (`ensureQueryData(authQueryOptions())`).
 */
import { queryOptions, useQuery } from '@tanstack/react-query';
import { getMe } from '@/lib/bff';

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

/** Avatar text: the first letters of the first two words, uppercased (`"Maya Reyes" → "MR"`). */
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

/** Sidebar sub-label: the first role, Title-cased; `"Member"` when the user has no roles. */
export function roleLabel(roles: string[]): string {
  const first = roles[0];
  if (!first) {
    return 'Member';
  }
  return first.charAt(0).toUpperCase() + first.slice(1);
}
