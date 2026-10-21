import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CapabilityMap } from '../src/capabilities/index';
import { CapabilityProvider } from '../src/renderers/studio/studio-capabilities';
import { FormStudio } from '../src/studio';

// Doc 221 — the affordances a governing template takes away, tested THROUGH THE SHELL.
//
// Every case here is a bug that the gate-level tests could not see, because each gate was correct and
// simply never reached: `inspectorForm` filtered by `governing` while its only caller never passed
// one, and the actions popover consulted `capability.remove` while nothing consulted `locked` or the
// parent's `addChildren`. All three were found by hand in the browser.
//
// So these render the real studio over a governed document rather than calling the gates.

const schema: JsonSchema = { type: 'object', properties: {} };

const uischema = {
  type: 'Form',
  id: 'root1',
  label: 'A form',
  elements: [
    { type: 'Heading', id: 'h1', text: 'One' },
    { type: 'Heading', id: 'h2', text: 'Two' },
  ],
} as unknown as UISchemaElement;

const CLOSED = {
  edit: 'none',
  remove: false,
  move: false,
  addChildren: false,
  removeChildren: false,
  reorderChildren: false,
  edges: false,
} as const;

function renderGoverned(value: CapabilityMap) {
  return render(
    <CapabilityProvider value={value}>
      <FormStudio schema={schema} uischema={uischema} />
    </CapabilityProvider>,
  );
}

const itemFor = (text: string) =>
  screen
    .getByRole('heading', { name: text })
    .closest<HTMLElement>('[data-slot="studio-grid-item"]') as HTMLElement;

const actionMenus = () => screen.queryAllByRole('dialog', { name: 'Element actions' });
const inspector = () => document.querySelector<HTMLElement>('[data-studio-inspector]');

describe('the inspector is narrowed by `edit`', () => {
  // The bug: `inspectorForm` had the filter, and `inspectorFor` never passed `governing` to it. Every
  // field stayed on offer for a frozen element, and the unit test passed because it called
  // `inspectorForm` directly.
  it('offers ONLY the field keys `edit` names', async () => {
    renderGoverned({ default: { '*': CLOSED }, elements: { h1: { edit: ['text'] } } });
    fireEvent.pointerDown(itemFor('One'));

    await waitFor(() => expect(inspector()?.textContent).toContain('Text'));
    const labels = [...(inspector()?.querySelectorAll('label') ?? [])].map((l) =>
      l.textContent?.trim(),
    );
    expect(labels).toEqual(['Text']);
    // A Heading's other settings exist and must NOT be offered.
    expect(labels).not.toContain('Heading level');
    expect(labels).not.toContain('Heading size');
  });

  it('offers the full set when `edit` is all', async () => {
    renderGoverned({ default: { '*': CLOSED }, elements: { h1: { edit: 'all' } } });
    fireEvent.pointerDown(itemFor('One'));

    await waitFor(() => expect(inspector()?.textContent).toContain('Text'));
    const labels = [...(inspector()?.querySelectorAll('label') ?? [])].map((l) =>
      l.textContent?.trim(),
    );
    expect(labels.length).toBeGreaterThan(1);
  });
});

describe('the actions popover', () => {
  it('does not open at all on a LOCKED element (rule 5)', async () => {
    // Hovering a locked element must read as "nothing to do here", not as a menu with its Delete
    // quietly missing.
    renderGoverned({ default: { '*': CLOSED }, elements: { h1: { edit: ['text'] } } });
    fireEvent.pointerOver(itemFor('Two'));

    await waitFor(() => expect(itemFor('Two')).toHaveAttribute('data-locked'));
    expect(actionMenus()).toHaveLength(0);
  });

  it('does not open when every action it would hold is denied', async () => {
    // h1 is NOT locked — its text is editable — but Copy needs the parent's `addChildren` and Delete
    // its own `remove`, and neither is granted. An empty popover is still chrome.
    renderGoverned({ default: { '*': CLOSED }, elements: { h1: { edit: ['text'] } } });
    fireEvent.pointerOver(itemFor('One'));

    await waitFor(() => expect(itemFor('One')).toHaveAttribute('data-hovered'));
    expect(itemFor('One')).not.toHaveAttribute('data-locked');
    expect(actionMenus()).toHaveLength(0);
  });

  it('offers Copy — and only Copy — when the PARENT accepts children', async () => {
    // A copy lands BESIDE the element, so it is the parent that must accept it.
    renderGoverned({
      default: { '*': CLOSED },
      elements: { h1: { edit: ['text'] }, root1: { addChildren: true } },
    });
    fireEvent.pointerOver(itemFor('One'));

    const menu = await screen.findByRole('dialog', { name: 'Element actions' });
    expect(within(menu).getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('offers Delete — and only Delete — when the element may be removed', async () => {
    renderGoverned({
      default: { '*': CLOSED },
      elements: { h1: { edit: ['text'], remove: true }, root1: { removeChildren: true } },
    });
    fireEvent.pointerOver(itemFor('One'));

    const menu = await screen.findByRole('dialog', { name: 'Element actions' });
    expect(within(menu).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: 'Copy' })).toBeNull();
  });

  it('offers both when nothing governs the document', async () => {
    // The control: every assertion above must be caused by the map, not by the shell.
    render(<FormStudio schema={schema} uischema={uischema} />);
    fireEvent.pointerOver(itemFor('One'));

    const menu = await screen.findByRole('dialog', { name: 'Element actions' });
    expect(within(menu).getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });
});
