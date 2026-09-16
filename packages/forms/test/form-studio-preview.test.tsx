import type { UISchemaElement } from '@jsonforms/core';
import { mdiPlay } from '@mdi/js';
import { render, screen } from '@testing-library/react';
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
    expect(slot('toggle-group')).toBeNull();
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
