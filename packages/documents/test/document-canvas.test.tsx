import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { DocumentCanvas } from '../src/studio/document-canvas';
import type { Uischema } from '../src/studio/document-types';
import { condition, control, edge, form, funnel, row } from './funnel-fixtures';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

const schema = {
  properties: { age: { type: 'integer', title: 'Age' }, name: { type: 'string', title: 'Name' } },
};

/** The canvas bound to state, with the uischema written out, so a test reads what an edit produced. */
function Harness({ initial }: { initial: Uischema }) {
  const [uischema, setUischema] = useState(initial);
  return (
    <>
      <DocumentCanvas uischema={uischema} schema={schema} onChange={setUischema} />
      <output data-testid="uischema">{JSON.stringify(uischema)}</output>
    </>
  );
}

const uischemaOf = (): Uischema => JSON.parse(screen.getByTestId('uischema').textContent ?? 'null');
const links = () =>
  (
    (
      uischemaOf()['options'] as {
        edges: { source: string; sourceHandle?: string; target: string }[];
      }
    ).edges ?? []
  ).map(
    (e) => `${e.source}${e.sourceHandle === undefined ? '' : `[${e.sourceHandle}]`}>${e.target}`,
  );
const withCondition = () =>
  funnel(
    [form('A', 'A', [control('age')]), form('X', 'X'), form('B', 'B', [control('name')])],
    [edge('e0', 'A', 'c1'), edge('e1', 'c1', 'X', 'r1'), edge('e2', 'c1', 'B')],
    [condition('c1', [row('r1', 'Condition 1')], 'Eligible?')],
  );

describe('DocumentCanvas', () => {
  it('adds a Form or a Condition from the + after a lone Form', async () => {
    const user = userEvent.setup();
    render(<Harness initial={form('A')} />);

    await user.click(await screen.findByRole('button', { name: 'Add condition after A' }));

    const variant = uischemaOf() as { type: string; options: { conditions: { id: string }[] } };
    expect(variant.type).toBe('Funnel');
    expect(links()[0]).toBe(`A>${variant.options.conditions[0]!.id}`);
    expect(
      await screen.findByRole('button', { name: 'Edit Untitled condition' }),
    ).toBeInTheDocument();
  });

  it('splits a persisted edge from its + with a Form', async () => {
    const user = userEvent.setup();
    render(<Harness initial={funnel([form('A'), form('B')], [edge('e1', 'A', 'B')])} />);

    await user.click(await screen.findByRole('button', { name: 'Add form after A' }));

    const added = (uischemaOf()['elements'] as Uischema[])[1]!['id'];
    expect(links()).toEqual([`A>${added}`, `${added}>B`]);
  });

  it("draws each branch's condition on its edge, and the default path as Default", async () => {
    const { container } = render(<Harness initial={withCondition()} />);
    await screen.findByRole('button', { name: 'Edit Eligible?' });

    const labels = [...container.querySelectorAll('[data-slot="document-studio-branch-label"]')];
    expect(labels.map((l) => l.textContent)).toEqual(['Condition 1 (not set)', 'Default']);
  });

  it('edits a Condition in its dialog, offering only upstream fields; Save adds a Form per new branch', async () => {
    const user = userEvent.setup();
    render(<Harness initial={withCondition()} />);

    await user.click(await screen.findByRole('button', { name: 'Edit Eligible?' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit condition' });
    const first = within(dialog).getByRole('listitem', { name: 'Branch 1' });
    await user.click(within(first).getByRole('button', { name: 'Add clause' }));
    const field = within(first).getByRole('combobox', { name: 'Field' });
    expect(
      within(field)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Age']);
    fireEvent.change(within(first).getByRole('combobox', { name: 'Operator' }), {
      target: { value: 'gte' },
    });
    fireEvent.change(within(first).getByRole('spinbutton', { name: 'Value' }), {
      target: { value: '18' },
    });
    await user.click(within(dialog).getByRole('button', { name: 'Add branch' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    const rows = (uischemaOf()['options'] as { conditions: { options: { rows: unknown[] } }[] })
      .conditions[0]!.options.rows;
    expect(rows).toEqual([
      {
        id: 'r1',
        label: 'Condition 1',
        match: 'all',
        clauses: [{ id: expect.any(String), field: 'age', operator: 'gte', value: 18 }],
      },
      { id: expect.any(String), label: 'Condition 2', match: 'all', clauses: [] },
    ]);
    expect(links().filter((l) => l.startsWith('c1['))).toHaveLength(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('discards dialog edits on Cancel', async () => {
    const user = userEvent.setup();
    render(<Harness initial={withCondition()} />);
    const before = uischemaOf();

    await user.click(await screen.findByRole('button', { name: 'Edit Eligible?' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit condition' });
    await user.click(within(dialog).getByRole('button', { name: 'Add branch' }));
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(uischemaOf()).toEqual(before);
  });

  it('deletes a Condition, reconnecting what led into it to its default target', async () => {
    const user = userEvent.setup();
    render(<Harness initial={withCondition()} />);

    await user.click(await screen.findByRole('button', { name: 'Delete Eligible?' }));

    expect(links()).toEqual(['A>B']);
  });

  it('draws no incoming handle on a first node, and one on every node something connects into', async () => {
    const { container } = render(
      <Harness initial={funnel([form('A'), form('B')], [edge('e1', 'A', 'B')])} />,
    );
    await screen.findByRole('button', { name: 'Delete B' });
    const [first, second] = container.querySelectorAll('[data-slot="document-studio-form-node"]');

    expect(first?.querySelector('.react-flow__handle.target')).toBeNull();
    expect(second?.querySelector('.react-flow__handle.target')).not.toBeNull();
  });

  // The jsdom shim measures every element as at least 1px, so it cannot see a 0×0 end node — which xyflow never
  // initialises, silently dropping every trailing edge and its +. Pin the real size instead.
  it('gives end nodes a real size, or xyflow never draws a trailing edge', async () => {
    const { container } = render(<Harness initial={form('A')} />);
    await screen.findByRole('button', { name: 'Add form after A' });

    expect(container.querySelector('[data-slot="document-studio-end-node"]')).toHaveClass(
      'size-px',
    );
  });

  it('empties the canvas after the last Form is deleted, offering to add one', async () => {
    const user = userEvent.setup();
    render(<Harness initial={form('A')} />);

    await user.click(await screen.findByRole('button', { name: 'Delete A' }));
    await act(async () => {});

    expect(uischemaOf()).toEqual({});
    expect(screen.getByRole('button', { name: 'Add a form to get started' })).toBeInTheDocument();
  });

  it('turns the flow red when its first Form is deleted from before a Condition, and the + above it fixes that', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness initial={withCondition()} />);
    const red = () =>
      [...container.querySelectorAll('[data-slot$="-node"][data-invalid]')].filter((n) =>
        /form-node|condition-node/.test(n.getAttribute('data-slot') ?? ''),
      ).length;

    await user.click(await screen.findByRole('button', { name: 'Delete A' }));
    const before = await screen.findByRole('button', { name: 'Add form before Eligible?' });
    expect(red()).toBe(3);
    expect(container.querySelector('[data-slot="document-studio-start-badge"]')).toBeNull();
    expect(container.querySelector('[data-slot="document-studio-end-badge"]')).toBeNull();

    await user.click(before);

    const added = (uischemaOf()['elements'] as Uischema[]).at(-1)!['id'];
    expect(links()).toContain(`${added}>c1`);
    expect(
      screen.queryByRole('button', { name: 'Add form before Eligible?' }),
    ).not.toBeInTheDocument();
  });
});
