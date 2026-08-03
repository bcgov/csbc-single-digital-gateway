import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Route } from '@/routes/services.index';

// Mock ServicesPage to isolate route file component registration
vi.mock('@/components/services-page', () => ({
  ServicesPage: () => <div data-testid="mock-services-page">Mock Services Page</div>,
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

describe('ServicesIndexRoute', () => {
  it('registers ServicesPage as its component correctly', async () => {
    const Component = Route.options.component;
    expect(Component).toBeDefined();

    if (Component) {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <Component />
        </React.Suspense>,
      );
      const servicesPageElement = await screen.findByTestId('mock-services-page');
      expect(servicesPageElement).toBeInTheDocument();
      expect(servicesPageElement).toHaveTextContent('Mock Services Page');
    }
  });
});
