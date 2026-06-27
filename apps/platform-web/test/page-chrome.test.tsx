import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageChromeProvider, usePageChrome, useSetPageChrome } from '@/lib/page-chrome';

function Setter({ title, description }: { title: string; description?: string }) {
  useSetPageChrome({ title, description, breadcrumb: <span>crumb:{title}</span> });
  return null;
}

function Reader() {
  const chrome = usePageChrome();
  return (
    <div>
      <span data-testid="title">{chrome?.title ?? '—'}</span>
      <span data-testid="desc">{chrome?.description ?? '—'}</span>
    </div>
  );
}

describe('page-chrome', () => {
  it('sets the active chrome without an update loop', () => {
    // A looping effect would throw "Maximum update depth exceeded" and fail this render.
    render(
      <PageChromeProvider>
        <Reader />
        <Setter title="Service A" description="Desc A" />
      </PageChromeProvider>,
    );
    expect(screen.getByTestId('title')).toHaveTextContent('Service A');
    expect(screen.getByTestId('desc')).toHaveTextContent('Desc A');
  });

  it('a child entry overlays its parent (stack) — top of stack wins', () => {
    render(
      <PageChromeProvider>
        <Reader />
        <Setter title="Detail" />
        <Setter title="Builder" description="editing" />
      </PageChromeProvider>,
    );
    expect(screen.getByTestId('title')).toHaveTextContent('Builder');
    expect(screen.getByTestId('desc')).toHaveTextContent('editing');
  });
});
