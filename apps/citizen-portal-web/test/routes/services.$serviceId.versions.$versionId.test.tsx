import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Route } from '@/routes/services.$serviceId.versions.$versionId';
import { getService } from '@/lib/catalog';
import { redirect } from '@tanstack/react-router';

// Mock ServiceVersionPage
vi.mock('@/components/service-version-page', () => ({
  ServiceVersionPage: () => <div data-testid="mock-version-page">Mock Service Version Page</div>,
}));

// Mock catalog api calls
vi.mock('@/lib/catalog', () => ({
  getService: vi.fn(),
}));

// Mock @tanstack/react-router partially
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createFileRoute: vi.fn(() =>
      vi.fn((config) => ({
        options: config,
      })),
    ),
    redirect: vi.fn((payload) => {
      throw payload;
    }),
    lazyRouteComponent: (importer: any, exportName: string) => {
      return React.lazy(async () => {
        const module = await importer();
        return { default: module[exportName || 'Component'] };
      });
    },
  };
});

describe('ServiceVersionRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers ServiceVersionPage as its component correctly', async () => {
    const Component = Route.options.component;
    expect(Component).toBeDefined();

    if (Component) {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <Component />
        </React.Suspense>,
      );
      expect(
        await screen.findByTestId('mock-version-page', {}, { timeout: 10000 }),
      ).toBeInTheDocument();
    }
  });

  describe('beforeLoad redirect logic', () => {
    it('redirects to canonical service URL when the requested version is the current published version', async () => {
      const mockService = { id: 's1', publishedVersionId: 'v1' };
      vi.mocked(getService).mockResolvedValue(mockService as any);

      const beforeLoad = Route.options.beforeLoad;
      expect(beforeLoad).toBeDefined();

      if (beforeLoad) {
        await expect(
          beforeLoad({ params: { serviceId: 's1', versionId: 'v1' } } as any),
        ).rejects.toEqual({
          to: '/services/$serviceId',
          params: { serviceId: 's1' },
          replace: true,
        });

        expect(getService).toHaveBeenCalledWith('s1');
        expect(redirect).toHaveBeenCalledWith({
          to: '/services/$serviceId',
          params: { serviceId: 's1' },
          replace: true,
        });
      }
    });

    it('does not redirect when the requested version is a historical (not current) version', async () => {
      const mockService = { id: 's1', publishedVersionId: 'v2' };
      vi.mocked(getService).mockResolvedValue(mockService as any);

      const beforeLoad = Route.options.beforeLoad;
      expect(beforeLoad).toBeDefined();

      if (beforeLoad) {
        await expect(
          beforeLoad({ params: { serviceId: 's1', versionId: 'v1' } } as any),
        ).resolves.toBeUndefined();

        expect(getService).toHaveBeenCalledWith('s1');
        expect(redirect).not.toHaveBeenCalled();
      }
    });

    it('does not redirect and completes gracefully if getService fails', async () => {
      vi.mocked(getService).mockRejectedValue(new Error('Network Error'));

      const beforeLoad = Route.options.beforeLoad;
      expect(beforeLoad).toBeDefined();

      if (beforeLoad) {
        await expect(
          beforeLoad({ params: { serviceId: 's1', versionId: 'v1' } } as any),
        ).resolves.toBeUndefined();

        expect(getService).toHaveBeenCalledWith('s1');
        expect(redirect).not.toHaveBeenCalled();
      }
    });
  });
});
