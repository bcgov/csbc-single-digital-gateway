import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Route } from '@/routes/__root';

// Mock TanStack React Router to isolate RootLayout rendering
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    Outlet: () => <div data-testid="mock-outlet">Mock Outlet Content</div>,
  };
});

describe('RootRoute', () => {
  it('renders the Outlet component correctly', () => {
    // Route.options.component contains RootLayout
    const RootLayoutComponent = Route.options.component;
    expect(RootLayoutComponent).toBeDefined();

    if (!RootLayoutComponent) {
      throw new Error('RootLayoutComponent is not defined');
    }

    render(<RootLayoutComponent />);
    const outletElement = screen.getByTestId('mock-outlet');
    expect(outletElement).toBeInTheDocument();
    expect(outletElement).toHaveTextContent('Mock Outlet Content');
  });

  it('has the correct route configuration options', () => {
    expect(Route.options).toBeDefined();
    expect(Route.options).toHaveProperty('component');
    expect(Object.keys(Route.options)).toContain('component');
  });
});
