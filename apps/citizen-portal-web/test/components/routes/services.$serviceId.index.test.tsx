import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Route } from '@/routes/services.$serviceId.index';

// Mock ServiceDetailPage to isolate route file component registration
vi.mock('@/components/service-detail-page', () => ({
  ServiceDetailPage: () => (
    <div data-testid="mock-service-detail-page">Mock Service Detail Page</div>
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

describe('ServiceDetailRoute', () => {
  it('registers ServiceDetailPage as its component correctly', async () => {
    const Component = Route.options.component;
    expect(Component).toBeDefined();

    if (Component) {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <Component />
        </React.Suspense>,
      );
      const serviceDetailPageElement = await screen.findByTestId('mock-service-detail-page');
      expect(serviceDetailPageElement).toBeInTheDocument();
      expect(serviceDetailPageElement).toHaveTextContent('Mock Service Detail Page');
    }
  });
});
