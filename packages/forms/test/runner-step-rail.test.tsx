import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { FormRunner } from '../src/runner/form-runner';

// Doc 202 rules 10d and 11b — the ghost step, reached-stage borders and the current Form's active indicator, as the
// rail renders them inside a real runner.

const schema: JsonSchema = {
  type: 'object',
  properties: { note: { type: 'string', title: 'Note' } },
};
/** `note` REQUIRED: a blank required field is what leaves the Condition undecided, so the ghost shows (rule 10f). */
const requiredNote: JsonSchema = { ...schema, required: ['note'] };
const el = (element: object) => element as UISchemaElement;
const form = (label: string, keys: string[] = []) => ({
  type: 'Form',
  label,
  options: { id: `${label}-id` },
  elements: keys.map((key) => ({ type: 'Control', scope: `#/properties/${key}` })),
});
const stage = (id: string, label: string, forms: object[]) =>
  el({ type: 'Stage', label, options: { id }, elements: forms });

/** Applicant (two Forms) → Condition on `note` → (pro) Pro → Extra | (default) Basic. Branches of 2 and 1 stages. */
const BRANCHING = el({
  type: 'Flow',
  options: {
    edges: [
      { id: 'e1', source: 's1', target: 'x' },
      { id: 'e2', source: 'x', target: 's2', sourceHandle: 'c1' },
      { id: 'e3', source: 's2', target: 's4' },
      { id: 'e4', source: 'x', target: 's3' },
    ],
  },
  elements: [
    stage('s1', 'Applicant', [form('Contact', ['note']), form('Address')]),
    el({
      type: 'Condition',
      options: {
        id: 'x',
        criteria: [{ id: 'c1', field: 'note', operator: 'equals', value: 'pro' }],
      },
    }),
    stage('s2', 'Pro', [form('Pro form')]),
    stage('s3', 'Basic', [form('Basic form')]),
    stage('s4', 'Extra', [form('Extra form')]),
  ],
});

function Harness({
  initial = {},
  documentSchema = schema,
}: {
  initial?: Record<string, unknown>;
  documentSchema?: JsonSchema;
}) {
  const [data, setData] = useState<Record<string, unknown>>(initial);
  return <FormRunner schema={documentSchema} uischema={BRANCHING} data={data} onChange={setData} />;
}

const settle = () => act(async () => {});
const sidebar = () => screen.getByRole('navigation', { name: 'Steps' });
const slot = (name: string) => sidebar().querySelector<HTMLElement>(`[data-slot="${name}"]`);
const stageRow = (id: string) =>
  sidebar().querySelector<HTMLElement>(`[data-slot="runner-stage"][data-stage-id="${id}"]`);
const stageButton = (id: string) => within(stageRow(id) as HTMLElement).getAllByRole('button')[0];
const nextButton = () => screen.getByRole('button', { name: 'Next' });

describe('the ghost step (rule 10d)', () => {
  it('follows the listed steps with the range an unmade choice may still add', async () => {
    render(<Harness documentSchema={requiredNote} />);
    await settle();
    const ghost = slot('runner-step-ghost');
    expect(ghost).toHaveTextContent('1–2 more stages');
    // Last in the list, after the real steps, and not a control.
    expect(ghost?.parentElement?.lastElementChild).toBe(ghost);
    expect(within(ghost as HTMLElement).queryByRole('button')).toBeNull();
    expect(ghost).toHaveClass('border-dashed');
  });

  it('disappears once the answer decides the path', async () => {
    render(<Harness documentSchema={requiredNote} />);
    await settle();
    fireEvent.change(screen.getByRole('textbox', { name: /^Note/ }), { target: { value: 'pro' } });
    await waitFor(() => expect(slot('runner-step-ghost')).toBeNull());
  });

  it('shows no ghost when the field is OPTIONAL — the default route is already listed (rule 10f)', async () => {
    render(<Harness />);
    await settle();
    const listed = [...sidebar().querySelectorAll('[data-slot="runner-stage-name"]')].map(
      (name) => name.textContent,
    );
    expect(listed).toEqual(['Applicant', 'Basic']);
    expect(slot('runner-step-ghost')).toBeNull();
  });

  it('keeps its caption for assistive tech when the rail collapses', async () => {
    render(<Harness documentSchema={requiredNote} />);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse steps' }));
    const caption = within(slot('runner-step-ghost') as HTMLElement).getByText('1–2 more stages');
    expect(caption).toHaveClass('sr-only');
  });
});

describe('the step number (rule 9f)', () => {
  it('is a bold numeral with no circle, on the same grid row as the stage name', async () => {
    render(<Harness />);
    await settle();
    const row = stageButton('s1') as HTMLElement;
    const number = row.querySelector('[data-slot="runner-step-number"]');
    expect(number).toHaveTextContent('1');
    expect(number).toHaveClass('font-bold', 'text-bcgov-blue'); // s1 is current, so reached
    expect(number).not.toHaveClass('rounded-full');
    expect(number).not.toHaveClass('border');
    // Aligned with the name: both on the second grid row, which the grid aligns by baseline.
    expect(row).toHaveClass('grid', 'items-baseline');
    expect(number).toHaveClass('row-start-2');
    // The name sits in a row-2 wrapper beside its error flag (rule 27d).
    expect(row.querySelector('[data-slot="runner-stage-name"]')?.parentElement).toHaveClass(
      'row-start-2',
    );
  });

  it('is centred when the rail collapses', async () => {
    render(<Harness documentSchema={requiredNote} />);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse steps' }));
    const row = stageButton('s1') as HTMLElement;
    expect(row).toHaveClass('justify-center', 'px-0');
    expect(row).not.toHaveClass('grid');
    expect(slot('runner-step-ghost')).toHaveClass('justify-center');
  });
});

describe('opening a stage (rules 25, 11e)', () => {
  it('selects its FIRST Form, even when the citizen left it on a later one', async () => {
    render(<Harness initial={{ note: 'pro' }} />);
    await settle();
    const selected = () => sidebar().querySelector<HTMLElement>('[aria-current="page"]');
    // Contact → Address (second Form of Applicant) → Pro.
    fireEvent.click(nextButton());
    await waitFor(() => expect(selected()).toHaveTextContent('Address'));
    fireEvent.click(nextButton());
    await waitFor(() => expect(stageButton('s2')).toHaveAttribute('aria-current', 'step'));

    fireEvent.click(stageButton('s1') as HTMLElement);

    await waitFor(() => expect(selected()).toHaveTextContent('Contact'));
    // The row carries the visual state; `aria-current` is on its button (rule 11f).
    expect(selected()?.closest('li')).toHaveClass('border-l-bcgov-blue', 'font-bold');
    expect(screen.getByRole('textbox', { name: /^Note/ })).toBeInTheDocument();
  });
});

describe('page items (rule 11f)', () => {
  it('opens a Form when its row is clicked, recorded so Back returns', async () => {
    render(<Harness />);
    await settle();
    const rowButton = (label: string) =>
      within(sidebar()).getByRole('button', { name: new RegExp(`^${label}`) });

    fireEvent.click(rowButton('Address'));

    await waitFor(() => expect(rowButton('Address')).toHaveAttribute('aria-current', 'page'));
    expect(rowButton('Contact')).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
  });
});

describe('a path change resets the stages after it (rule 10g)', () => {
  it('turns stages reached down the old path back into upcoming ones', async () => {
    // Ticking-in a branch mid-path: `note` = pro inserts Pro before Extra. Reach Basic by default first.
    render(<Harness />);
    await settle();
    // Contact → Address → Basic with Next: upcoming stages are locked (rule 25c).
    fireEvent.click(nextButton());
    await waitFor(() =>
      expect(sidebar().querySelector('[aria-current="page"]')).toHaveTextContent('Address'),
    );
    fireEvent.click(nextButton());
    await waitFor(() => expect(stageButton('s3')).toHaveAttribute('aria-current', 'step'));
    // Back to Applicant: Basic stays reached, since the path has not changed.
    fireEvent.click(stageButton('s1') as HTMLElement);
    await waitFor(() => expect(stageButton('s1')).toHaveAttribute('aria-current', 'step'));
    expect(stageRow('s3')).toHaveAttribute('data-reached');

    // Answering "pro" swaps Basic for Pro → Extra. Nothing past Applicant was reached on THIS path.
    fireEvent.change(screen.getByRole('textbox', { name: /^Note/ }), { target: { value: 'pro' } });
    await waitFor(() => expect(stageRow('s2')).not.toBeNull());
    expect(stageRow('s2')).not.toHaveAttribute('data-reached');
    expect(stageRow('s4')).not.toHaveAttribute('data-reached');

    // Switching back does not resurrect Basic's old progress.
    fireEvent.change(screen.getByRole('textbox', { name: /^Note/ }), {
      target: { value: 'basic' },
    });
    await waitFor(() => expect(stageRow('s3')).not.toBeNull());
    expect(stageRow('s3')).not.toHaveAttribute('data-reached');
    // The stage on screen keeps its progress throughout.
    expect(stageRow('s1')).toHaveAttribute('data-reached');
  });
});

describe('stage text (rule 9g)', () => {
  const text = (id: string, name: string) =>
    stageRow(id)?.querySelector(`[data-slot="${name}"]`) as HTMLElement;

  it('is bcgov-blue once reached and grey while ahead, with a bold title', async () => {
    render(<Harness initial={{ note: 'pro' }} />);
    await settle();
    for (const name of ['runner-step-number', 'runner-step-caption', 'runner-stage-name']) {
      expect(text('s1', name)).toHaveClass('text-bcgov-blue');
      // Rule 9g: the same grey as the upcoming stage's border.
      expect(text('s2', name)).toHaveClass('text-border');
      expect(text('s2', name)).not.toHaveClass('text-bcgov-blue');
    }
    expect(text('s1', 'runner-stage-name')).toHaveClass('font-bold');
    expect(text('s2', 'runner-stage-name')).toHaveClass('font-bold');
  });
});

describe('stage borders and the current Form (rule 11b)', () => {
  it('marks the current Form, not the stage, as active', async () => {
    render(<Harness />);
    await settle();
    const current = stageButton('s1');
    expect(current).toHaveClass('border-l-4', 'border-l-primary');
    // Rule 11d: the active stage shares the selected Form's background; a stage that is not current does not.
    expect(current).toHaveClass('bg-accent');
    // Only the LEFT edge is coloured: Button borders every side, so an all-sides colour would box the row.
    expect(current).not.toHaveClass('border-primary');

    const forms = [...sidebar().querySelectorAll<HTMLElement>('[data-slot="runner-stage-form"]')];
    const [contact, address] = forms;
    expect(contact?.querySelector('button')).toHaveAttribute('aria-current', 'page');
    // Rule 11e: the selected Form stands out from the tinted stage — blue line, bold blue text.
    expect(contact).toHaveClass('bg-accent', 'border-l-bcgov-blue', 'font-bold', 'text-bcgov-blue');
    expect(address).toHaveClass('border-l-border', 'text-muted-foreground');
    expect(address).not.toHaveClass('bg-accent');
    expect(address).not.toHaveClass('font-bold');
    // Rule 11c: every Form row has the same THIN line, stacked with no gap under the numeral.
    for (const row of forms) {
      expect(row).toHaveClass('border-l');
      // Rule 11f: the padding moved onto the row's button, so the whole row is the click target.
      expect(row.querySelector('button')).toHaveClass('px-4', 'py-2');
      expect(row).not.toHaveClass('border-l-4');
    }
    const list = sidebar().querySelector('[data-slot="runner-stage-forms"]');
    expect(list).toHaveClass('ml-6.5');
    // It must never be pulled up over the stage row above it.
    expect(list?.className).not.toMatch(/(^|\s)-?m[ty]?-/);
    expect(list?.className).not.toMatch(/(^|\s)(mb|pb|p|py)-/);
    expect(list?.className).not.toMatch(/(^|\s)gap-/);
  });

  it('keeps the thick border on a stage already passed, and the thin line on one still ahead', async () => {
    render(<Harness initial={{ note: 'pro' }} />);
    await settle();
    expect(stageButton('s2')).toHaveClass('border-l-2', 'border-l-border');

    // Contact → Address → Pro.
    fireEvent.click(nextButton());
    await waitFor(() =>
      expect(sidebar().querySelector('[aria-current="page"]')).toHaveTextContent('Address'),
    );
    fireEvent.click(nextButton());
    await waitFor(() => expect(stageButton('s2')).toHaveAttribute('aria-current', 'step'));
    // Rule 11d: the tint moves with the active stage — the visited one behind it loses it.
    expect(stageButton('s2')).toHaveClass('bg-accent');
    expect(stageButton('s1')).not.toHaveClass('bg-accent');

    expect(stageButton('s1')).toHaveClass('border-l-4', 'border-l-primary');
    expect(stageButton('s2')).toHaveClass('border-l-4', 'border-l-primary');
    expect(stageButton('s4')).toHaveClass('border-l-2', 'border-l-border');
    expect(stageButton('s4')).not.toHaveClass('border-l-4');
  });
});
