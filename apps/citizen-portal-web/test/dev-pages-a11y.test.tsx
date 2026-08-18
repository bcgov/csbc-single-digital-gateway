import { screen } from '@testing-library/react';
import { afterEach, describe, it, vi } from 'vitest';
import { getA11yMetadata } from '@/a11y/a11y-catalog';
import { renderRoute } from './support/render-app';
import { expectNoUnjustifiedA11yViolations } from './support/a11y';

afterEach(() => {
  vi.restoreAllMocks();
});

// Every /dev reference page (apps/citizen-portal-web/src/components/dev/dev-pages-menu.tsx's
// DEV_PAGES list). `component` is the .a11y.ts sidecar's identifier — undefined for the two pages
// with no documented component yet (draggable is a placeholder, the tailwind index page is design
// tokens, not a component). Adding a new /dev page later is one entry here, not a new test file.
const DEV_PAGES: { path: string; component?: string }[] = [
  { path: '/dev' },
  { path: '/dev/cards', component: 'card' },
  { path: '/dev/badge', component: 'badge' },
  { path: '/dev/breadcrumb', component: 'breadcrumb' },
  { path: '/dev/button', component: 'button' },
  { path: '/dev/accordion', component: 'accordion' },
  { path: '/dev/icons', component: 'icons' },
  { path: '/dev/status-banner', component: 'status-banner' },
  { path: '/dev/form-elements', component: 'form-elements' },
  { path: '/dev/draggable' },
];

describe.each(DEV_PAGES)('a11y: $path', ({ path, component }) => {
  it('has no unjustified axe violations', async () => {
    const { container } = renderRoute(path);
    // "Developer reference" is DevPageLayout's own header label — unlike an <h1>, page content
    // never duplicates it, so it's a reliable "the route has rendered" signal on every /dev page.
    await screen.findByText('Developer reference', {}, { timeout: 10000 });

    const knownExceptions = component ? getA11yMetadata(component).knownExceptions : [];
    await expectNoUnjustifiedA11yViolations(container, knownExceptions);
  });
});
