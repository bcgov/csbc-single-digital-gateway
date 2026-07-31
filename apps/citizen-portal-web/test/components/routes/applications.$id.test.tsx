import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Route } from '@/routes/applications.$id';

// Mock ApplicationDetailPage to isolate route file component registration
vi.mock('@/components/application-detail-page', () => ({
  ApplicationDetailPage: () => (
    <div data-testid="mock-detail-page">Mock Application Detail Page</div>
  ),
}));

// Mock @tanstack/react-router createFileRoute helper and lazyRouteComponent partially
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    createFileRoute: vi.fn(() =>
      vi.fn((config) => ({
        options: config,
      })),
    ),
    lazyRouteComponent: (importer: any, exportName: string) => {
      return React.lazy(async () => {
        const module = await importer();
        return { default: module[exportName || 'Component'] };
      });
    },
  };
});

describe('ApplicationDetailRoute', () => {
  it('registers ApplicationDetailPage as its component correctly', async () => {
    const Component = Route.options.component;
    expect(Component).toBeDefined();

    if (Component) {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <Component />
        </React.Suspense>,
      );
      const detailPageElement = await screen.findByTestId('mock-detail-page');
      expect(detailPageElement).toBeInTheDocument();
      expect(detailPageElement).toHaveTextContent('Mock Application Detail Page');
    }
  });
});
