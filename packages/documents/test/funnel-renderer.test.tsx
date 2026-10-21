import { JsonForms } from '@jsonforms/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers/default/index';
import { condition, control, edge, form, funnel, row } from './funnel-fixtures';

const SCHEMA = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', title: 'Name' },
    biz: { type: 'boolean', title: 'Applying as a business' },
    company: { type: 'string', title: 'Company' },
    nickname: { type: 'string', title: 'Nickname' },
    agree: { type: 'boolean', title: 'I agree' },
  },
};

const isBiz = row('r1', 'Business', [{ id: 'k1', field: 'biz', operator: 'isTrue' }]);

/** Applicant → c{ biz: Business, default: Person } → Declaration. */
const FUNNEL = funnel(
  [
    form('a', 'Applicant', [control('name'), control('biz')]),
    form('b', 'Business', [control('company')]),
    form('p', 'Person', [control('nickname')]),
    form('d', 'Declaration', [control('agree')]),
  ],
  [
    edge('e1', 'a', 'c'),
    edge('e2', 'c', 'b', 'r1'),
    edge('e3', 'c', 'p'),
    edge('e4', 'b', 'd'),
    edge('e5', 'p', 'd'),
  ],
  [condition('c', [isBiz])],
);

/** The answers the host last received — JSONForms emits them DEBOUNCED, after its own state already changed. */
let hostData: unknown = {};

function Harness({ uischema }: { uischema: Record<string, unknown> }) {
  const [data, setData] = useState<unknown>({});
  hostData = data;
  return (
    <JsonForms
      schema={SCHEMA}
      uischema={uischema as never}
      data={data}
      renderers={defaults.renderers}
      cells={defaults.cells}
      onChange={({ data: next }) => setData(next)}
    />
  );
}

function setup(uischema: Record<string, unknown> = FUNNEL) {
  const user = userEvent.setup();
  const view = render(<Harness uischema={uischema} />);
  return { user, ...view };
}

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const rail = () => within(screen.getByRole('navigation', { name: 'Steps' }));
const stepNames = () =>
  [...document.querySelectorAll('[data-slot="funnel-step"] [data-slot="funnel-step-name"]')].map(
    (n) => n.textContent,
  );
const button = (name: string) => screen.getByRole('button', { name });
const content = () => within(slot('funnel-content')!);

async function fillName(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: /^Name/ }), 'Ada');
  await waitFor(() => expect(button('Next')).toBeEnabled());
  // TEST TRAP: Next reads JSONForms' state, which updates BEFORE its debounced onChange reaches the host. Acting in that
  // gap lets the stale emit come back as the data prop and reset the state, dropping the newer answer — so wait for
  // the host to hold the answer too.
  await waitFor(() => expect(hostData).toMatchObject({ name: 'Ada' }));
}

describe('Funnel renderer (doc 274)', () => {
  describe('layout (rules 15, 23-29)', () => {
    it('shows the projected path in the rail, the start Form alone, and the action bar', () => {
      setup();
      expect(slot('funnel')).not.toBeNull();
      // `biz` is optional, so leaving it blank already decides the branch: the default (rule 7).
      expect(stepNames()).toEqual(['Applicant', 'Person', 'Declaration']);
      expect(slot('funnel-step-ghost')).toBeNull();
      expect(rail().getByRole('button', { name: /Summary/ })).toBeDisabled();
      expect(content().getByRole('textbox', { name: /^Name/ })).toBeInTheDocument();
      expect(content().queryByRole('textbox', { name: 'Nickname' })).toBeNull();
      expect(rail().getByRole('button', { name: /Applicant/ })).toHaveAttribute(
        'aria-current',
        'step',
      );
      expect(button('Back')).toBeDisabled();
      expect(slot('runner-save-draft')).toBeDisabled();
    });

    it('collapses the rail to numerals', async () => {
      const { user } = setup();
      await user.click(button('Collapse steps'));
      expect(rail().getByRole('button', { name: 'Step 1: Applicant' })).toBeInTheDocument();
      expect(stepNames()).toEqual([]);
      await user.click(button('Expand steps'));
      expect(stepNames()).toEqual(['Applicant', 'Person', 'Declaration']);
    });

    it('stops the rail at an undecided branch and hints at what it may add (rules 11, 25)', async () => {
      const named = row('r1', 'Named', [
        { id: 'k1', field: 'name', operator: 'equals', value: 'Biz' },
      ]);
      const { user } = setup({
        ...FUNNEL,
        options: { ...(FUNNEL['options'] as object), conditions: [condition('c', [named])] },
      });
      // `name` is required and blank: the branch is not decided yet.
      expect(stepNames()).toEqual(['Applicant']);
      expect(slot('funnel-step-ghost')).toHaveTextContent('2 more steps');
      await user.type(screen.getByRole('textbox', { name: /^Name/ }), 'Biz');
      await waitFor(() => expect(stepNames()).toEqual(['Applicant', 'Business', 'Declaration']));
      expect(slot('funnel-step-ghost')).toBeNull();
    });

    it('says so when the Funnel has no Form to start at', () => {
      setup(funnel([], [], [condition('c', [])]));
      expect(slot('funnel-empty')).toHaveTextContent('This funnel has no form to start at.');
    });
  });

  describe('navigation (rules 16-17, 20, 24)', () => {
    it('blocks Next while the Form on screen owns an error', async () => {
      const { user } = setup();
      expect(button('Next')).toBeDisabled();
      await fillName(user);
    });

    it('follows the default branch, then Back returns through history', async () => {
      const { user } = setup();
      await fillName(user);
      await user.click(button('Next'));
      expect(content().getByRole('textbox', { name: 'Nickname' })).toBeInTheDocument();
      expect(rail().getByRole('button', { name: /Person/ })).toHaveAttribute(
        'aria-current',
        'step',
      );
      await user.click(button('Back'));
      expect(content().getByRole('textbox', { name: /^Name/ })).toBeInTheDocument();
      // A reached step opens from the rail.
      await user.click(rail().getByRole('button', { name: /Person/ }));
      expect(content().getByRole('textbox', { name: 'Nickname' })).toBeInTheDocument();
    });

    it('routes by the answers', async () => {
      const { user } = setup();
      await fillName(user);
      // user-event's pointer sequence does not toggle Base UI's checkbox in jsdom; the boolean tests click directly.
      fireEvent.click(screen.getByRole('checkbox', { name: 'Applying as a business' }));
      await waitFor(() => expect(stepNames()).toEqual(['Applicant', 'Business', 'Declaration']));
      await user.click(button('Next'));
      expect(content().getByRole('textbox', { name: 'Company' })).toBeInTheDocument();
    });

    it('locks steps not yet reached', async () => {
      const { user } = setup();
      await fillName(user);
      expect(rail().getByRole('button', { name: /Person/ })).toBeDisabled();
    });

    it('draws the path up to the current step dark, visited steps past it light, the rest grey (rule 23)', async () => {
      const { user } = setup();
      const stepRow = (label: RegExp) => rail().getByRole('button', { name: label });
      const name = (label: RegExp) =>
        stepRow(label).querySelector('[data-slot="funnel-step-name"]');
      await fillName(user);
      await user.click(button('Next'));
      // On Person: Applicant passed (dark, untinted), Person current, Declaration not yet reached.
      expect(stepRow(/Applicant/)).toHaveClass('border-l-primary');
      expect(stepRow(/Applicant/)).not.toHaveClass('bg-accent');
      expect(name(/Applicant/)).toHaveClass('text-bcgov-blue');
      expect(stepRow(/Person/)).toHaveClass('border-l-primary', 'bg-accent');
      expect(stepRow(/Declaration/)).toHaveClass('border-l-border');
      expect(name(/Declaration/)).toHaveClass('text-border');
      // Back to Applicant: Person was visited but is now past the current step — light blue.
      await user.click(button('Back'));
      expect(stepRow(/Person/)).toHaveClass('border-l-blue-70');
      expect(name(/Person/)).toHaveClass('text-blue-70');
      expect(name(/Applicant/)).toHaveClass('text-bcgov-blue');
    });
  });

  describe('summary page and submit (rules 18, 26, 30)', () => {
    async function toDeclaration(user: ReturnType<typeof userEvent.setup>) {
      await fillName(user);
      await user.click(button('Next'));
      await user.click(button('Next'));
      expect(content().getByRole('checkbox', { name: 'I agree' })).toBeInTheDocument();
    }

    it('keeps Summary unclickable until the last page is reached and the path is valid (rule 26)', async () => {
      const { user } = setup();
      const summary = () => rail().getByRole('button', { name: /Summary/ });
      expect(summary()).toBeDisabled();
      await fillName(user);
      // Every page valid, but the last one not reached yet.
      expect(summary()).toBeDisabled();
      await user.click(button('Next'));
      await user.click(button('Next'));
      expect(summary()).toBeEnabled();
      // Clearing a required answer on an earlier page locks it again.
      await user.click(rail().getByRole('button', { name: /Applicant/ }));
      await user.clear(screen.getByRole('textbox', { name: /^Name/ }));
      await waitFor(() => expect(summary()).toBeDisabled());
    });

    it('opens the summary of the path Forms, read-only, where Submit lives', async () => {
      const { user } = setup();
      await toDeclaration(user);
      await user.click(button('Next'));
      const summary = slot('funnel-summary')!;
      expect(within(summary).getByRole('heading', { name: 'Summary' })).toBeInTheDocument();
      const forms = [...summary.querySelectorAll('[data-slot="form"]')];
      expect(forms.map((f) => f.getAttribute('aria-label'))).toEqual([
        'Applicant',
        'Person',
        'Declaration',
      ]);
      expect(within(summary).getByRole('textbox', { name: /^Name/ })).toBeDisabled();
      // Form titles sit one step below the page heading (rule 30).
      expect(summary).toHaveClass('[&_[data-slot=form-title]]:text-h2');
      expect(rail().getByRole('button', { name: /Summary/ })).toHaveAttribute(
        'aria-current',
        'step',
      );
      await user.click(button('Submit'));
      const dialog = await screen.findByRole('dialog', { name: 'Submission preview' });
      expect(within(dialog).getByText(/"name": "Ada"/)).toBeInTheDocument();
      await user.click(within(dialog).getAllByRole('button', { name: 'Close' })[0]!);
      // Back leaves the summary for the Form the citizen was on.
      await user.click(button('Back'));
      expect(content().getByRole('checkbox', { name: 'I agree' })).toBeInTheDocument();
      // The summary is now visited but past the current step: the same light blue as any such step (rule 23).
      const summaryRow = rail().getByRole('button', { name: /Summary/ });
      expect(summaryRow).toHaveClass('border-l-blue-70');
      expect(summaryRow.querySelector('[data-slot="funnel-step-name"]')).toHaveClass(
        'text-blue-70',
      );
    });

    it('ends on the last Form when the summary page is off', async () => {
      const off = {
        ...FUNNEL,
        options: { ...(FUNNEL['options'] as object), showSummaryPage: false },
      };
      const { user } = setup(off);
      await toDeclaration(user);
      expect(button('Submit')).toBeEnabled();
      expect(screen.queryByRole('button', { name: /Summary/ })).toBeNull();
    });
  });
});
