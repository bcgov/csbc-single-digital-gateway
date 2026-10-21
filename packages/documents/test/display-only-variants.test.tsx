import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DocumentRunner } from '../src/runner';
import { DocumentStudio } from '../src/studio';
import type { DocumentContent } from '../src/studio/document-types';
import { isDisplayOnly, withDisplayOnly } from '../src/studio/variants/display-only';
import { variantProblems } from '../src/studio/variants/variant-problems';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

// Doc 284: a variant marked "Display only" is exempt from the required-fields rule and is never filled in.

const content = (summaryOptions?: Record<string, unknown>): DocumentContent => ({
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name' },
      note: { type: 'string', title: 'Note' },
    },
    required: ['name'],
  },
  variants: {
    default: {
      id: 'F',
      type: 'Form',
      label: 'Permit',
      elements: [{ id: 'n', type: 'Control', scope: '#/properties/name' }],
    },
    Summary: {
      id: 'S',
      type: 'Form',
      label: 'Summary',
      elements: [{ id: 'o', type: 'Control', scope: '#/properties/note' }],
      ...(summaryOptions !== undefined && { options: summaryOptions }),
    },
  },
  data: { name: 'Ada' },
});

describe('the flag (doc 284 rules 1-2)', () => {
  it('reads options.displayOnly === true, and never on the default variant', () => {
    expect(isDisplayOnly(content({ displayOnly: true }).variants['Summary']!)).toBe(true);
    expect(isDisplayOnly(content({ displayOnly: 'yes' }).variants['Summary']!)).toBe(false);
    expect(isDisplayOnly(content().variants['Summary']!)).toBe(false);
  });

  it('sets and removes the key, keeping other options, and refuses default or an unknown name', () => {
    const c = content({ gap: 'lg' });
    const on = withDisplayOnly(c, 'Summary', true);
    expect(on.variants['Summary']!['options']).toEqual({ gap: 'lg', displayOnly: true });
    const off = withDisplayOnly(on, 'Summary', false);
    expect(off.variants['Summary']!['options']).toEqual({ gap: 'lg' });
    expect(withDisplayOnly(c, 'Summary', false)).toBe(c);
    expect(withDisplayOnly(c, 'default', true)).toBe(c);
    expect(withDisplayOnly(c, 'Nope', true)).toBe(c);
  });
});

describe('the required-fields rule (doc 284 rule 3)', () => {
  it('reports a variant missing a required field unless it is display only', () => {
    expect(variantProblems(content())).toEqual([
      { variant: 'Summary', missing: [{ key: 'name', title: 'Name' }] },
    ]);
    expect(variantProblems(content({ displayOnly: true }))).toEqual([]);
  });
});

describe('the runner (doc 284 rule 6)', () => {
  it('refuses to fill a display-only root', () => {
    const c = content({ displayOnly: true });
    render(
      <DocumentRunner
        schema={c.schema}
        uischema={c.variants['Summary']!}
        data={{}}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveAttribute('data-slot', 'runner-display-only');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /submit/i })).toBeNull();
  });
});

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const tab = (name: string) => document.querySelector<HTMLElement>(`[data-variant-name="${name}"]`)!;

async function open(c: DocumentContent) {
  const onContentChange = vi.fn<(content: DocumentContent) => void>();
  const user = userEvent.setup();
  render(
    <DocumentStudio
      content={c}
      kind="document"
      type="services.service"
      onContentChange={onContentChange}
      fillable
    />,
  );
  await screen.findByRole('article', { name: 'Permit page' });
  return { user, onContentChange };
}

describe('the studio (doc 284 rules 4-5, 7)', () => {
  it('toggles Display only from the variant menu, clearing the warning and badging the tab', async () => {
    const { user, onContentChange } = await open(content());
    await user.click(tab('Summary'));
    expect(tab('Summary').querySelector('[data-slot="variant-problems"]')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Summary variant actions' }));
    const item = await screen.findByRole('menuitemcheckbox', { name: 'Display only' });
    expect(item).toHaveAttribute('aria-checked', 'false');
    await user.click(item);
    await waitFor(() =>
      expect(onContentChange.mock.calls.at(-1)?.[0].variants['Summary']!['options']).toEqual({
        displayOnly: true,
      }),
    );
    expect(tab('Summary').querySelector('[data-slot="variant-problems"]')).toBeNull();
    expect(within(tab('Summary')).getByText('Display only')).toBeInTheDocument();
  });

  it('offers no Display only switch on the default variant', async () => {
    await open(content());
    expect(screen.queryByRole('button', { name: /Default variant actions/ })).toBeNull();
  });

  it('previews a display-only variant read back, not filled in', async () => {
    const { user } = await open(content({ displayOnly: true }));
    await user.click(tab('Summary'));
    await user.click(
      within(slot('document-studio-mode')!).getByRole('button', { name: 'Preview' }),
    );
    const preview = slot('document-preview')!;
    expect(preview.querySelector('[data-slot="document-view"]')).not.toBeNull();
    expect(preview.querySelector('[data-slot="runner-display-only"]')).toBeNull();
    expect(within(preview).queryByRole('textbox')).toBeNull();
  });
});
