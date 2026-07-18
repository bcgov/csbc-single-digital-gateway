import { describe, expect, it, vi } from 'vitest';
import { authQueryOptions, useAuth, initials, roleLabel } from '@/lib/auth';
import { getMe } from '@/lib/bff';
import { useQuery } from '@tanstack/react-query';

// Mock TanStack query and BFF
vi.mock('@tanstack/react-query', () => ({
  queryOptions: vi.fn((opts) => opts),
  useQuery: vi.fn(),
}));

vi.mock('@/lib/bff', () => ({
  getMe: vi.fn(),
}));

describe('Auth module', () => {
  describe('authQueryOptions', () => {
    it('returns query configuration options with correct key and function', () => {
      const options = authQueryOptions();
      expect(options.queryKey).toEqual(['auth', 'me']);
      expect(options.queryFn).toBe(getMe);
      expect(options.staleTime).toBe(5 * 60 * 1000);
    });
  });

  describe('useAuth', () => {
    it('subscribes to query state by calling useQuery hook', () => {
      useAuth();
      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['auth', 'me'],
        }),
      );
    });
  });

  describe('initials helper', () => {
    it('extracts uppercase initials for first two words in name', () => {
      expect(initials('Maya Reyes')).toBe('MR');
      expect(initials('Maya Reyes Smith')).toBe('MR');
      expect(initials('lewis')).toBe('L');
      expect(initials('multiple    spaces   name')).toBe('MS');
      expect(initials('lowercase name')).toBe('LN');
    });

    it('returns question mark placeholder for empty names', () => {
      expect(initials('')).toBe('?');
      expect(initials('   ')).toBe('?');
    });
  });

  describe('roleLabel helper', () => {
    it('returns first role capitalized', () => {
      expect(roleLabel(['admin', 'member'])).toBe('Admin');
      expect(roleLabel(['editor'])).toBe('Editor');
    });

    it('falls back to Member if roles array is empty', () => {
      expect(roleLabel([])).toBe('Member');
    });
  });
});
