import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Route } from '@/routes/index';

// Mock HomePage to isolate route file component registration
vi.mock('@/components/home-page', () => ({
  HomePage: () => <div data-testid="mock-home-page">Mock Home Page</div>,
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

describe('IndexRoute', () => {
  it('registers HomePage as its component correctly', async () => {
    const Component = Route.options.component;
    expect(Component).toBeDefined();

    if (Component) {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <Component />
        </React.Suspense>,
      );
      const homePageElement = await screen.findByTestId('mock-home-page');
      expect(homePageElement).toBeInTheDocument();
      expect(homePageElement).toHaveTextContent('Mock Home Page');
    }
  });
});
