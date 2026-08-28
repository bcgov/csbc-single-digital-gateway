import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

// /dev/form-elements renders many JSON Forms controls, several of which surface popover/dialog
// content only after an interaction (a select's listbox, a date picker's calendar, the contact
// methods "add" dialog). The sweep above only ever scans the page's default static state, so it
// never exercises any of that — these cases render the same page, drive one interaction each with
// userEvent, and re-scan once the new content is visible.
describe('/dev/form-elements interactions', () => {
  const knownExceptions = getA11yMetadata('form-elements').knownExceptions;

  it('has no unjustified axe violations with the enum-select dropdown open', async () => {
    const { container } = renderRoute('/dev/form-elements');
    await screen.findByText('Developer reference', {}, { timeout: 10000 });

    // "Province" is used by both the Full example section and the Selection controls section's
    // "Enum select" demo — scope to the latter's <section> (via its h2) to get a single match.
    const selectionHeading = screen.getByRole('heading', { name: 'Selection controls', level: 2 });
    const selectionSection = selectionHeading.closest('section') as HTMLElement;
    const provinceSelect = within(selectionSection).getByRole('combobox', { name: 'Province' });

    await userEvent.setup().click(provinceSelect);
    await screen.findByRole('listbox');

    await expectNoUnjustifiedA11yViolations(container, knownExceptions);
  }, 15000);

  it('has no unjustified axe violations with the toggle switch checked', async () => {
    const { container } = renderRoute('/dev/form-elements');
    await screen.findByText('Developer reference', {}, { timeout: 10000 });

    const toggle = screen.getByRole('switch', { name: 'Email me about updates' });
    await userEvent.setup().click(toggle);
    await vi.waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));

    await expectNoUnjustifiedA11yViolations(container, knownExceptions);
  }, 15000);

  it('has no unjustified axe violations with a date picker calendar open', async () => {
    const { container } = renderRoute('/dev/form-elements');
    await screen.findByText('Developer reference', {}, { timeout: 10000 });

    // Scope to "Date of birth"'s own Field — the page has more than one "Open calendar" button
    // (the plain date control and the date-range control each render one).
    const dobInput = screen.getByLabelText('Date of birth');
    const dobField = dobInput.closest('[data-slot="field"]') as HTMLElement;
    const calendarButton = within(dobField).getByRole('button', { name: 'Open calendar' });

    await userEvent.setup().click(calendarButton);
    await screen.findByRole('grid');

    await expectNoUnjustifiedA11yViolations(container, knownExceptions);
  }, 15000);

  it('has no unjustified axe violations with the add-contact-method dialog open', async () => {
    const { container } = renderRoute('/dev/form-elements');
    await screen.findByText('Developer reference', {}, { timeout: 10000 });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Add Contact Method' }));
    await screen.findByRole('dialog', { name: 'Add contact method' });

    await expectNoUnjustifiedA11yViolations(container, knownExceptions);
  }, 15000);
});
