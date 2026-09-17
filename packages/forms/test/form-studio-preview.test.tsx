import type { UISchemaElement } from '@jsonforms/core';
import { mdiPlay } from '@mdi/js';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FormStudio } from '../src/studio';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from '../src/studio/sample';

// Doc 184 — Form Studio preview mode.

function renderStudio(uischema?: UISchemaElement) {
  // Doc 200 rule 23: a bare studio now opens the New form dialog, so preview's fixture seeds explicitly.
  const view = render(
    <FormStudio schema={STUDIO_SAMPLE_SCHEMA} uischema={uischema ?? STUDIO_SAMPLE_UISCHEMA} />,
  );
  const slot = (name: string) => view.container.querySelector<HTMLElement>(`[data-slot="${name}"]`);
  return { ...view, slot };
}

/**
 * Types into a field without a pointer press. jsdom cannot lay react-resizable-panels out (doc 181
 * known issue): every rect is 0×0 at the origin, and so is userEvent's pointer, so rrp's document
 * `pointerdown` listener counts any press as a separator grab and calls `preventDefault()`, which stops
 * the field taking focus. In a browser a press on a field is nowhere near a separator, so rrp finds no
 * hit. Focusing first and skipping the click keeps the assertions about the form itself.
 */
async function typeWithoutPointer(
  user: ReturnType<typeof userEvent.setup>,
  field: HTMLElement,
  text: string,
) {
  field.focus();
  await user.type(field, text, { skipClick: true });
}

const previewToggle = () => screen.getByRole('button', { name: 'Preview' });
const panelToggle = (name: string) => screen.getByRole('button', { name });
const iconPath = (element: HTMLElement) => element.querySelector('svg path')?.getAttribute('d');

describe('preview toggle (rules 1-4)', () => {
  it("is the header's last child, right of the panel toggles, and starts unpressed", () => {
    const { slot } = renderStudio();
    const toggle = previewToggle();
    const header = slot('form-studio-header');

    expect(header?.lastElementChild).toBe(toggle);
    expect(toggle.previousElementSibling).toHaveAttribute('data-slot', 'toggle-group');
    expect(toggle).toHaveAttribute('data-slot', 'toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(header).toHaveClass('gap-1');
  });

  it('looks like the dock toggles: a 24px outline square, grey off, black on', () => {
    renderStudio();
    expect(previewToggle()).toHaveClass(
      'border',
      'size-6',
      'min-w-6',
      'px-0',
      'text-gray-70',
      'aria-pressed:text-foreground',
    );
  });

  it('shows the play icon in both modes and only its pressed state changes', async () => {
    const user = userEvent.setup();
    renderStudio();
    expect(iconPath(previewToggle())).toBe(mdiPlay);

    await user.click(previewToggle());

    expect(previewToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(iconPath(previewToggle())).toBe(mdiPlay);
  });
});

describe('entering preview (rules 5-8)', () => {
  it('removes the panel toggles and closes the open panels', async () => {
    const user = userEvent.setup();
    const { slot } = renderStudio();
    expect(slot('form-studio-left-panel')).not.toHaveAttribute('inert');

    await user.click(previewToggle());

    expect(screen.queryByRole('group', { name: 'Panels' })).toBeNull();
    // Doc 184 rule 15: the one toggle group left in the header is the preview size picker.
    expect(slot('toggle-group')).toHaveAttribute('aria-label', 'Preview size');
    expect(slot('form-studio-left-panel')).toHaveAttribute('inert');
    expect(slot('form-studio-right-panel')).toHaveAttribute('inert');
    expect(slot('form-studio-bottom-panel')).toHaveAttribute('inert');
  });

  it('renders the form with the fillable default renderers: no studio frames, plain CSS layouts, enabled fields', async () => {
    const user = userEvent.setup();
    const { container } = renderStudio();
    await screen.findByRole('textbox', { name: 'Name' });
    expect(container.querySelector('[data-slot="studio-grid-item"]')).not.toBeNull();

    await user.click(previewToggle());
    const name = await screen.findByRole('textbox', { name: 'Name' });

    expect(name).toBeEnabled();
    expect(name.closest('[inert]')).toBeNull();
    expect(container.querySelector('[data-slot="studio-grid-item"]')).toBeNull();
    expect(container.querySelector('[data-slot="studio-element"]')).toBeNull();
    // Doc 193 rule 3: fillable forms lay out with plain CSS, no gridstack.
    expect(container.querySelector('.grid-stack')).toBeNull();
    expect(container.querySelector('[data-slot="fill-layout"]')).not.toBeNull();
  });

  it("previews the studio's current document", async () => {
    const user = userEvent.setup();
    renderStudio({
      type: 'Form',
      elements: [{ type: 'Heading', text: 'Custom form', options: { level: 1 } }],
    } as UISchemaElement);

    await user.click(previewToggle());

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Custom form' }),
    ).toBeInTheDocument();
  });

  it('keeps typed values while previewing', async () => {
    const user = userEvent.setup();
    renderStudio();
    await user.click(previewToggle());
    const name = await screen.findByRole('textbox', { name: 'Name' });

    await typeWithoutPointer(user, name, 'Ada');

    expect(name).toHaveValue('Ada');
  });

  it('previews a whole Form document through the runner, with its action bar (doc 202 rule 40c)', async () => {
    const user = userEvent.setup();
    const { slot } = renderStudio();
    await user.click(previewToggle());
    await screen.findByRole('textbox', { name: 'Name' });

    // A basic form is the ENTIRE form a citizen fills, so preview shows the actions: Save draft disabled
    // because no handler is passed (rule 37), and Submit present to open the payload dialog (rule 38).
    expect(slot('runner-actions')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();

    // Rule 7: a Form root has no stages, so no sidebar and no Next.
    expect(slot('runner-sidebar')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });

  it('frames whatever preview renders, with the content inside it (doc 202 rule 40d)', async () => {
    const user = userEvent.setup();
    const { slot } = renderStudio();
    await user.click(previewToggle());
    await screen.findByRole('textbox', { name: 'Name' });

    const frame = slot('form-studio-preview-frame');
    expect(frame).not.toBeNull();
    // Asserted as CONTAINMENT, not mere presence: a border rendered as a sibling would look right in a
    // screenshot and still be structurally wrong.
    expect(frame?.querySelector('[data-slot="form-runner"]')).not.toBeNull();
    // Full height with no scroll of its own, so the runner's action bar stays pinned to the frame's bottom
    // edge rather than floating under the fields.
    expect(frame).toHaveClass('h-full', 'overflow-hidden');

    await user.click(previewToggle());
    expect(slot('form-studio-preview-frame')).toBeNull();
  });
});

const sizeGroup = () => screen.queryByRole('group', { name: 'Preview size' });
const size = (name: string) => within(sizeGroup() as HTMLElement).getByRole('button', { name });
const frame = (slot: (name: string) => HTMLElement | null) => slot('form-studio-preview-frame');

describe('preview size (rules 15-17)', () => {
  it('is offered only while previewing, immediately left of the Preview toggle (rule 15)', async () => {
    const user = userEvent.setup();
    renderStudio();
    expect(sizeGroup()).toBeNull();

    await user.click(previewToggle());

    expect(previewToggle().previousElementSibling).toBe(sizeGroup());
    expect(
      within(sizeGroup() as HTMLElement)
        .getAllByRole('button')
        .map((item) => item.getAttribute('aria-label')),
    ).toEqual(['Desktop', 'Tablet', 'Mobile']);

    await user.click(previewToggle());
    expect(sizeGroup()).toBeNull();
  });

  it('starts at Desktop, filling the pane (rule 16)', async () => {
    const user = userEvent.setup();
    const { slot } = renderStudio();
    await user.click(previewToggle());

    expect(size('Desktop')).toHaveAttribute('aria-pressed', 'true');
    expect(frame(slot)).toHaveAttribute('data-viewport', 'desktop');
    expect(frame(slot)).toHaveClass('w-full');
    expect(frame(slot)?.className).not.toMatch(/max-w-/);
  });

  it('caps and centres the frame for Tablet and Mobile (rule 17)', async () => {
    const user = userEvent.setup();
    const { slot } = renderStudio();
    await user.click(previewToggle());

    await user.click(size('Tablet'));
    expect(frame(slot)).toHaveClass('max-w-[768px]');
    await user.click(size('Mobile'));
    expect(frame(slot)).toHaveAttribute('data-viewport', 'mobile');
    expect(frame(slot)).toHaveClass('max-w-[400px]');
    expect(size('Mobile')).toHaveAttribute('aria-pressed', 'true');
    expect(size('Tablet')).toHaveAttribute('aria-pressed', 'false');
    // Centred by its parent, so a capped frame sits mid-pane rather than against the left edge.
    expect(frame(slot)?.parentElement).toHaveClass('flex', 'justify-center');
  });

  it('keeps a size when its own button is pressed again, so one is always chosen (rule 15)', async () => {
    const user = userEvent.setup();
    const { slot } = renderStudio();
    await user.click(previewToggle());
    await user.click(size('Mobile'));

    await user.click(size('Mobile'));

    expect(size('Mobile')).toHaveAttribute('aria-pressed', 'true');
    expect(frame(slot)).toHaveAttribute('data-viewport', 'mobile');
  });

  it('remembers the chosen size into the next preview (rule 16)', async () => {
    const user = userEvent.setup();
    const { slot } = renderStudio();
    await user.click(previewToggle());
    await user.click(size('Tablet'));
    await user.click(previewToggle());

    await user.click(previewToggle());

    expect(size('Tablet')).toHaveAttribute('aria-pressed', 'true');
    expect(frame(slot)).toHaveAttribute('data-viewport', 'tablet');
  });
});

describe('leaving preview (rules 9-12)', () => {
  it('discards typed values, so the next preview starts empty', async () => {
    const user = userEvent.setup();
    renderStudio();
    await user.click(previewToggle());
    const typed = await screen.findByRole('textbox', { name: 'Name' });
    await typeWithoutPointer(user, typed, 'Ada');
    // Guard: without this the test would pass even if typing never reached the field.
    expect(typed).toHaveValue('Ada');

    await user.click(previewToggle());
    await user.click(previewToggle());

    expect(await screen.findByRole('textbox', { name: 'Name' })).toHaveValue('');
  });

  it('restores the panel toggles and reopens only the panels that were open', async () => {
    const user = userEvent.setup();
    const { slot } = renderStudio();
    await user.click(panelToggle('Right panel'));

    await user.click(previewToggle());
    await user.click(previewToggle());

    expect(previewToggle()).toHaveAttribute('aria-pressed', 'false');
    expect(panelToggle('Left panel')).toHaveAttribute('aria-pressed', 'true');
    expect(panelToggle('Right panel')).toHaveAttribute('aria-pressed', 'true');
    expect(panelToggle('Bottom panel')).toHaveAttribute('aria-pressed', 'false');
    expect(slot('form-studio-left-panel')).not.toHaveAttribute('inert');
    expect(slot('form-studio-bottom-panel')).toHaveAttribute('inert');
  });

  it('brings back the studio renderers', async () => {
    const user = userEvent.setup();
    const { container } = renderStudio();
    await user.click(previewToggle());
    await screen.findByRole('textbox', { name: 'Name' });

    await user.click(previewToggle());

    expect(await screen.findByRole('textbox', { name: 'Name' })).toBeDisabled();
    expect(container.querySelector('[data-slot="studio-grid-item"]')).not.toBeNull();
  });

  // Doc 193 rule 3 (supersedes doc 184 rules 7b-7d) — preview lays out with plain CSS; the studio keeps gridstack.
  it('renders preview layouts with plain CSS and studio layouts with gridstack', async () => {
    const user = userEvent.setup();
    const { slot } = renderStudio();
    const canvas = () => slot('form-studio-center-panel');
    const count = (selector: string) => canvas()?.querySelectorAll(selector).length ?? 0;
    await screen.findByRole('textbox', { name: 'Name' });
    expect(count('.grid-stack')).toBeGreaterThan(1);
    expect(count('[data-slot="fill-layout"]')).toBe(0);

    await user.click(previewToggle());
    await screen.findByRole('textbox', { name: 'Name' });

    expect(count('.grid-stack, .grid-stack-item')).toBe(0);
    expect(count('[data-slot="fill-layout"]')).toBeGreaterThan(1);
  });
});
