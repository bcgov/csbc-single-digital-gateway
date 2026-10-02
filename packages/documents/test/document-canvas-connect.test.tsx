import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { DocumentCanvas } from '../src/studio/document-canvas';
import type { DeleteChoices } from '../src/studio/delete-gate';
import type { Uischema } from '../src/studio/document-types';
import { condition, edge, form, formIds, funnel, links, row } from './funnel-fixtures';
import { withStart } from '../src/studio/funnel-model';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

/** The canvas bound to state, with the uischema written out, so a test reads what an edit produced. */
function Harness({ initial, choices = {} }: { initial: Uischema; choices?: DeleteChoices }) {
  const [uischema, setUischema] = useState(initial);
  const [deleteChoices, setDeleteChoices] = useState(choices);
  return (
    <>
      <DocumentCanvas
        uischema={uischema}
        schema={{}}
        onChange={setUischema}
        deleteChoices={deleteChoices}
        onRememberDelete={(kind, choice) => setDeleteChoices((c) => ({ ...c, [kind]: choice }))}
      />
      <output data-testid="uischema">{JSON.stringify(uischema)}</output>
    </>
  );
}

const current = (): Uischema => JSON.parse(screen.getByTestId('uischema').textContent ?? 'null');
const canvas = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="document-studio-canvas"]')!;
const nodeOf = (container: HTMLElement, id: string) =>
  container.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"] [data-slot$="-node"]`)!;
/** By slot: the harness's own `<output>` also has the implicit `status` role. */
const prompt = () =>
  document.querySelector<HTMLElement>('[data-slot="document-studio-connect-prompt"]');
const connecting = (container: HTMLElement) => canvas(container).hasAttribute('data-connecting');

/** a → b, and a floating f: b and f have free outputs. */
const chain = () => funnel([form('a'), form('b'), form('f')], [edge('e1', 'a', 'b')]);

async function choose(user: ReturnType<typeof userEvent.setup>, plus: string, option: string) {
  await user.click(await screen.findByRole('button', { name: plus }));
  await user.click(screen.getByRole('menuitem', { name: option }));
}

/** c1 is headless (r1 → x); a and f are free Forms; c2 has a free row q1 and a free default. */
const headless = () =>
  funnel(
    [form('a'), form('x'), form('f')],
    [edge('e1', 'c1', 'x', 'r1')],
    [condition('c1', [row('r1')], 'Eligible?'), condition('c2', [row('q1')], 'Route')],
  );

/** A → Eligible? (r1 → X, default → B). */
const withCondition = () =>
  funnel(
    [form('A'), form('X'), form('B')],
    [edge('e0', 'A', 'c1'), edge('e1', 'c1', 'X', 'r1'), edge('e2', 'c1', 'B')],
    [condition('c1', [row('r1')], 'Eligible?')],
  );

describe('DocumentCanvas connections (doc 235)', () => {
  it("offers each + its own options: a trailing edge's three, a split's two (rule 2)", async () => {
    const user = userEvent.setup();
    render(<Harness initial={chain()} />);

    await user.click(await screen.findByRole('button', { name: 'Add after b' }));
    expect(
      within(screen.getByRole('menu'))
        .getAllByRole('menuitem')
        .map((i) => i.textContent),
    ).toEqual(['Connection', 'Condition', 'Form']);
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'Add after a' }));
    expect(
      within(screen.getByRole('menu'))
        .getAllByRole('menuitem')
        .map((i) => i.textContent),
    ).toEqual(['Condition', 'Form']);
  });

  it('adds a Form from a trailing + as the pill did (rule 4)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={chain()} />);

    await choose(user, 'Add after b', 'Form');

    const added = formIds(current()).find((id) => !['a', 'b', 'f'].includes(id!))!;
    expect(links(current())).toEqual(['a>b', `b>${added}`]);
  });

  it('enters connect mode: blue ring, the prompt, pickable and dimmed nodes (rules 5-7)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness initial={chain()} />);

    await choose(user, 'Add after b', 'Connection');

    expect(connecting(container)).toBe(true);
    expect(canvas(container)).toHaveClass('after:ring-2', 'after:ring-primary', 'after:ring-inset');
    expect(prompt()).toHaveTextContent('Choose a condition or form to connect');
    expect(prompt()).toHaveTextContent('Click the background or escape to cancel');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    // a would close a loop, b is the source itself; f is free to join.
    expect(nodeOf(container, 'a')).toHaveAttribute('data-connect', 'dimmed');
    expect(nodeOf(container, 'b')).toHaveAttribute('data-connect', 'dimmed');
    expect(nodeOf(container, 'f')).toHaveAttribute('data-connect', 'pickable');
  });

  it('connects the free output to a picked node and leaves the mode (rules 8, 9)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness initial={chain()} />);
    await choose(user, 'Add after b', 'Connection');

    fireEvent.click(nodeOf(container, 'f'));

    expect(links(current())).toEqual(['a>b', 'b>f']);
    expect(connecting(container)).toBe(false);
    expect(prompt()).toBeNull();
  });

  it('ignores a click on a dimmed node, staying in the mode (rule 8)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness initial={chain()} />);
    await choose(user, 'Add after b', 'Connection');

    fireEvent.click(nodeOf(container, 'a'));

    expect(connecting(container)).toBe(true);
    expect(links(current())).toEqual(['a>b']);
  });

  it('cancels from a background click, changing nothing (rule 8)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness initial={chain()} />);
    await choose(user, 'Add after b', 'Connection');

    fireEvent.click(container.querySelector('.react-flow__pane')!);

    expect(connecting(container)).toBe(false);
    expect(prompt()).toBeNull();
    expect(links(current())).toEqual(['a>b']);
  });

  it('cancels on Escape (rule 8)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness initial={chain()} />);
    await choose(user, 'Add after b', 'Connection');

    fireEvent.keyDown(canvas(container), { key: 'Escape' });

    expect(connecting(container)).toBe(false);
  });

  it('cancels from a click on another +, without opening its panel (rules 6, 8)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness initial={chain()} />);
    await choose(user, 'Add after b', 'Connection');

    fireEvent.click(screen.getByRole('button', { name: 'Add after f' }));

    expect(connecting(container)).toBe(false);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('connects into an orphaned Form from its leading +, which offers Connection only (rule 10b)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness initial={withStart(chain(), 'a')} />);

    await user.click(await screen.findByRole('button', { name: 'Add before f' }));
    expect(
      within(screen.getByRole('menu'))
        .getAllByRole('menuitem')
        .map((i) => i.textContent),
    ).toEqual(['Connection']);
    await user.click(screen.getByRole('menuitem', { name: 'Connection' }));
    // a's output already leads to b; f is the target itself.
    expect(nodeOf(container, 'a')).toHaveAttribute('data-connect', 'dimmed');
    expect(nodeOf(container, 'f')).toHaveAttribute('data-connect', 'dimmed');
    fireEvent.click(nodeOf(container, 'b'));

    expect(links(current())).toEqual(['a>b', 'b>f']);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Add before f' })).not.toBeInTheDocument(),
    );
  });

  describe('from a leading edge', () => {
    it('offers Form, then Connection (rule 2)', async () => {
      const user = userEvent.setup();
      render(<Harness initial={headless()} />);

      await user.click(await screen.findByRole('button', { name: 'Add before Eligible?' }));

      expect(
        within(screen.getByRole('menu'))
          .getAllByRole('menuitem')
          .map((i) => i.textContent),
      ).toEqual(['Form', 'Connection']);
    });

    it("connects a picked Form's free output into the headless Condition (rules 7, 9, 10)", async () => {
      const user = userEvent.setup();
      const { container } = render(<Harness initial={headless()} />);
      await choose(user, 'Add before Eligible?', 'Connection');

      expect(nodeOf(container, 'x')).toHaveAttribute('data-connect', 'dimmed');
      expect(nodeOf(container, 'c1')).toHaveAttribute('data-connect', 'dimmed');
      fireEvent.click(nodeOf(container, 'a'));

      expect(links(current())).toContain('a>c1');
      await waitFor(() =>
        expect(
          screen.queryByRole('button', { name: 'Add before Eligible?' }),
        ).not.toBeInTheDocument(),
      );
    });

    it('asks which output when the picked Condition has several free ones (rule 9)', async () => {
      const user = userEvent.setup();
      const { container } = render(<Harness initial={headless()} />);
      await choose(user, 'Add before Eligible?', 'Connection');

      fireEvent.click(nodeOf(container, 'c2'));

      const chooser = await screen.findByRole('menu', { name: 'Connect from' });
      expect(
        within(chooser)
          .getAllByRole('menuitem')
          .map((i) => i.textContent),
      ).toEqual(['q1 (not set)', 'Default']);
      await user.click(within(chooser).getByRole('menuitem', { name: 'Default' }));

      expect(links(current())).toContain('c2>c1');
      expect(connecting(container)).toBe(false);
    });

    it('closes the output chooser on Escape and stays in the mode (rule 9)', async () => {
      const user = userEvent.setup();
      const { container } = render(<Harness initial={headless()} />);
      await choose(user, 'Add before Eligible?', 'Connection');
      fireEvent.click(nodeOf(container, 'c2'));
      await screen.findByRole('menu', { name: 'Connect from' });

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('menu', { name: 'Connect from' })).not.toBeInTheDocument();
      expect(connecting(container)).toBe(true);
    });
  });

  describe('deleting a Condition (rules 12, 13)', () => {
    it('keeps the branch nodes, unconnected, from Condition only', async () => {
      const user = userEvent.setup();
      render(<Harness initial={withCondition()} />);

      await user.click(await screen.findByRole('button', { name: 'Delete Eligible?' }));
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', {
          name: 'Condition only',
        }),
      );

      expect(formIds(current())).toEqual(['A', 'X', 'B']);
      expect(links(current())).toEqual(['A>B']);
    });

    it('removes the branch nodes from All branches', async () => {
      const user = userEvent.setup();
      render(<Harness initial={withCondition()} />);

      await user.click(await screen.findByRole('button', { name: 'Delete Eligible?' }));
      await user.click(
        within(await screen.findByRole('alertdialog')).getByRole('button', {
          name: 'All branches',
        }),
      );

      expect(formIds(current())).toEqual(['A', 'B']);
    });

    it('applies a remembered Condition choice without asking', async () => {
      const user = userEvent.setup();
      render(<Harness initial={withCondition()} choices={{ condition: 'node' }} />);

      await user.click(await screen.findByRole('button', { name: 'Delete Eligible?' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(formIds(current())).toEqual(['A', 'X', 'B']);
    });

    it('remembers a choice per kind: a remembered Form delete still asks for a Condition', async () => {
      const user = userEvent.setup();
      render(<Harness initial={withCondition()} choices={{ form: 'node' }} />);

      await user.click(await screen.findByRole('button', { name: 'Delete Eligible?' }));

      expect(
        await screen.findByRole('alertdialog', { name: 'Delete condition?' }),
      ).toBeInTheDocument();
    });

    it('records the button pressed with "Remember my preference" for that kind only', async () => {
      const user = userEvent.setup();
      render(
        <Harness
          initial={funnel(
            [form('A'), form('X'), form('B'), form('Y')],
            [
              edge('e0', 'A', 'c1'),
              edge('e1', 'c1', 'X', 'r1'),
              edge('e2', 'c1', 'B'),
              edge('e3', 'B', 'c2'),
              edge('e4', 'c2', 'Y', 'q1'),
            ],
            [condition('c1', [row('r1')], 'First'), condition('c2', [row('q1')], 'Second')],
          )}
        />,
      );

      await user.click(await screen.findByRole('button', { name: 'Delete First' }));
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('checkbox', { name: 'Remember my preference' }));
      await user.click(within(dialog).getByRole('button', { name: 'Condition only' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

      await user.click(await screen.findByRole('button', { name: 'Delete Second' }));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(formIds(current())).toContain('Y');

      await user.click(screen.getByRole('button', { name: 'Delete X' }));
      expect(await screen.findByRole('alertdialog', { name: 'Delete form?' })).toBeInTheDocument();
    });
  });
});

describe('Connection with nothing to connect to (doc 235 rule 2b)', () => {
  it('is listed disabled, and choosing it never enters connect mode', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Harness initial={funnel([form('a'), form('b')], [edge('e1', 'a', 'b')])} />,
    );
    await user.click(await screen.findByRole('button', { name: 'Add after b' }));
    const connection = screen.getByRole('menuitem', { name: 'Connection' });
    expect(connection).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: 'Form' })).not.toHaveAttribute('aria-disabled');

    await user.click(connection);
    expect(connecting(container)).toBe(false);
    expect(prompt()).toBeNull();
  });

  it('stays enabled where a node can be picked', async () => {
    const user = userEvent.setup();
    render(<Harness initial={chain()} />);
    await user.click(await screen.findByRole('button', { name: 'Add after b' }));
    expect(screen.getByRole('menuitem', { name: 'Connection' })).not.toHaveAttribute(
      'aria-disabled',
    );
  });
});
