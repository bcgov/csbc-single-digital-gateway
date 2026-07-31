import { describe, expect, it, vi, beforeEach } from 'vitest';
import { initials, firstName, authQueryOptions, useAuth, useLoginUrl } from '@/lib/auth';

const mockUseLocation = vi.fn();
const mockUseQuery = vi.fn();
const mockGetMe = vi.fn();
const mockLoginUrlFor = vi.fn(
  (path: string) => `http://mock-bff/login?returnTo=${encodeURIComponent(path)}`,
);

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => mockUseLocation(),
}));

vi.mock('@tanstack/react-query', () => ({
  queryOptions: (options: any) => options,
  useQuery: (options: any) => mockUseQuery(options),
}));

vi.mock('@/lib/bff', () => ({
  getMe: () => mockGetMe(),
  loginUrlFor: (path: string) => mockLoginUrlFor(path),
}));

describe('auth lib', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initials', () => {
    it('returns initials for two-word names', () => {
      expect(initials('Amina Ali')).toBe('AA');
    });

    it('returns initials for multi-word names (only first two words)', () => {
      expect(initials('Amina Ali Baker')).toBe('AA');
    });

    it('returns single initial for one-word names', () => {
      expect(initials('Amina')).toBe('A');
    });

    it('handles leading, trailing, and multiple spaces', () => {
      expect(initials('  amina   ali  ')).toBe('AA');
    });

    it('returns "?" for empty or whitespace-only names', () => {
      expect(initials('')).toBe('?');
      expect(initials('   ')).toBe('?');
    });

    it('converts initials to uppercase', () => {
      expect(initials('amina ali')).toBe('AA');
    });
  });

  describe('firstName', () => {
    it('returns the first word of a name', () => {
      expect(firstName('Amina Ali')).toBe('Amina');
    });

    it('handles single-word names', () => {
      expect(firstName('Amina')).toBe('Amina');
    });

    it('handles leading and trailing spaces', () => {
      expect(firstName('   Amina   Ali  ')).toBe('Amina');
    });

    it('returns empty string/original name when name is empty', () => {
      expect(firstName('')).toBe('');
      expect(firstName('   ')).toBe('');
    });
  });

  describe('authQueryOptions', () => {
    it('returns the correct query options', () => {
      const options = authQueryOptions();
      expect(options.queryKey).toEqual(['auth', 'me']);
      expect(options.staleTime).toBe(5 * 60 * 1000);

      // Execute the queryFn and check that it calls getMe
      options.queryFn!({} as any);
      expect(mockGetMe).toHaveBeenCalledTimes(1);
    });
  });

  describe('useAuth', () => {
    it('calls useQuery with the authQueryOptions', () => {
      mockUseQuery.mockReturnValue({ data: { id: 'user-1' }, isPending: false });

      const result = useAuth();

      expect(mockUseQuery).toHaveBeenCalledTimes(1);
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['auth', 'me'],
        }),
      );
      expect(result).toEqual({ data: { id: 'user-1' }, isPending: false });
    });
  });

  describe('useLoginUrl', () => {
    it('gets current location and returns the login URL for it', () => {
      mockUseLocation.mockReturnValue({ href: 'http://localhost:3000/dashboard?tab=profile' });

      const loginUrl = useLoginUrl();

      expect(mockUseLocation).toHaveBeenCalledTimes(1);
      expect(mockLoginUrlFor).toHaveBeenCalledWith('http://localhost:3000/dashboard?tab=profile');
      expect(loginUrl).toBe(
        'http://mock-bff/login?returnTo=http%3A%2F%2Flocalhost%3A3000%2Fdashboard%3Ftab%3Dprofile',
      );
    });
  });
});
