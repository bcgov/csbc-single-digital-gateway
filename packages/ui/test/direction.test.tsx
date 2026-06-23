import { render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { DirectionProvider, useDirection } from '@ui/components/ui/direction';

const RtlWrapper = ({ children }: { children: ReactNode }) => (
  <DirectionProvider direction="rtl">{children}</DirectionProvider>
);

describe('direction', () => {
  it('exports DirectionProvider and useDirection', () => {
    expect(DirectionProvider).toBeDefined();
    expect(useDirection).toBeDefined();
  });

  it('renders children inside the provider', () => {
    render(
      <DirectionProvider direction="rtl">
        <span>directional content</span>
      </DirectionProvider>,
    );
    expect(screen.getByText('directional content')).toBeInTheDocument();
  });

  it('exposes the provided direction through useDirection', () => {
    const { result } = renderHook(() => useDirection(), { wrapper: RtlWrapper });
    expect(result.current).toBe('rtl');
  });

  it('defaults to ltr when no provider is present', () => {
    const { result } = renderHook(() => useDirection());
    expect(result.current).toBe('ltr');
  });
});
