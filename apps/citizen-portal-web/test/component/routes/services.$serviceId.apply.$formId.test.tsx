import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Route } from '@/routes/services.$serviceId.apply.$formId';

// Mock ApplicationPage to isolate route file component registration
vi.mock('@/components/application-page', () => ({
  ApplicationPage: () => <div data-testid="mock-application-page">Mock Application Page</div>,
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

describe('ApplicationRoute', () => {
  it('registers ApplicationPage as its component correctly', async () => {
    const Component = Route.options.component;
    expect(Component).toBeDefined();

    if (Component) {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <Component />
        </React.Suspense>,
      );
      const applicationPageElement = await screen.findByTestId('mock-application-page');
      expect(applicationPageElement).toBeInTheDocument();
      expect(applicationPageElement).toHaveTextContent('Mock Application Page');
    }
  });
});
