import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { DocumentContent } from '../src/studio/document-types';
import { FoldsProvider } from '../src/studio/foldable-section';
import { InspectorSettings } from '../src/studio/inspector/inspector-settings';
import { control, form } from './funnel-fixtures';

const CONTENT: DocumentContent = {
  schema: {
    type: 'object',
    properties: {
      n: { type: 'number', title: 'Age' },
      t: { type: 'string', title: 'Bio' },
      r: { type: 'object', required: ['root'], title: 'Story' },
    },
  },
  variants: {
    default: form('F', 'Page', [
      control('n'),
      { ...control('t'), options: { component: 'textarea' } },
      control('r'),
      { id: 'h', type: 'Heading', options: { text: 'Hi' } },
    ]),
  },
};

/** The studio's side, with a selection the test can change. */
function Harness({ initial }: { initial: string }) {
  const [selected, setSelected] = useState(initial);
  return (
    <FoldsProvider>
      <button type="button" onClick={() => setSelected('c-t')}>
        pick bio
      </button>
      <InspectorSettings
        content={CONTENT}
        pageSelectedId={selected}
        focusedId="F"
        formId="F"
        onContentChange={() => {}}
      />
    </FoldsProvider>
  );
}

const stack = () => document.querySelector<HTMLElement>('[data-slot="inspector-stack"]')!;
const sections = () => [
  ...document.querySelectorAll<HTMLElement>('[data-slot="foldable-section"]'),
];
const heading = (name: string) =>
  screen.getByRole('button', { name: new RegExp(`^${name}$`, 'i') });

describe('inspector density (doc 252 rules 1-6)', () => {
  it("hides a required field's * — now beside its label, not inside it (doc 285 rule 5)", () => {
    // `Display as` is a required inspector select: it renders the marker, and the stack hides it.
    render(<Harness initial="c-t" />);
    const marker = stack().querySelector('[data-slot="required-marker"]');
    expect(marker).not.toBeNull();
    expect(marker!.closest('[data-slot="field-label"]')).toBeNull();
    expect(stack()).toHaveClass(
      '[&_[data-slot=required-marker]]:hidden',
      '[&_[data-slot=control-label-line]]:min-w-0',
    );
  });

  it('carries the compact type, 28px controls and small switches on the root stack', () => {
    render(<Harness initial="c-n" />);
    expect(stack()).toHaveClass(
      'text-xs',
      '[&_[data-slot=field-label]]:text-xs',
      '[&_[data-slot=input]]:h-7',
      '[&_[data-slot=number-input-input]]:h-7',
      '[&_[data-slot=input-group]]:h-7',
      '[&_[data-slot=boolean-field]]:min-h-7',
    );
    for (const name of ['Required', 'Whole numbers only']) {
      expect(screen.getByRole('switch', { name })).toHaveAttribute('data-size', 'sm');
    }
  });

  it('lays text, number and choice fields out as label-beside-control rows', () => {
    render(<Harness initial="c-n" />);
    expect(stack()).toHaveClass(
      '[&_[data-slot=text-field][data-component=input]]:grid',
      '[&_[data-slot=number-field]]:grid',
      '[&_[data-slot=choice-field]]:grid',
      '[&_[data-slot=number-field]]:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]',
      '[&_[data-slot=field-label]]:truncate',
      '[&_[data-slot=field-description]]:col-span-2',
      '[&_[data-slot=field-description]]:order-last',
    );
    // Numbers: a narrow, right-aligned box at the end of the control column (rule 2b).
    expect(stack()).toHaveClass(
      '[&_[data-slot=number-input]]:w-20',
      '[&_[data-slot=number-input]]:justify-self-end',
      '[&_[data-slot=number-input-input]]:text-right',
    );
    expect(
      stack().querySelector('[data-slot="number-field"] > [data-slot="number-input"]'),
    ).not.toBeNull();
    // The selectors the classes rely on are what the inspector's controls actually render.
    expect(
      stack().querySelector('[data-slot="text-field"][data-component="input"]'),
    ).not.toBeNull();
    expect(stack().querySelector('[data-slot="number-field"]')).not.toBeNull();
  });

  it('keeps text area and rich text full width, with a compact rich editor', () => {
    render(<Harness initial="c-r" />);
    // Neither full-width slot is named by a row selector.
    const rows = stack()
      .className.split(' ')
      .filter((c) => c.endsWith(':grid'));
    expect(rows.some((c) => c.includes('textarea') || c.includes('rich-text'))).toBe(false);
    expect(
      stack().querySelector('[data-slot="text-field"][data-component="textarea"]'),
    ).not.toBeNull();
    expect(stack().querySelector('[data-slot="rich-text-field"]')).toBeNull();
    expect(stack()).toHaveClass(
      '[&_[data-slot=rich-text-content]]:px-2',
      '[&_[data-slot=rich-text-placeholder]]:px-2',
      '[&_[data-slot=rich-text-toolbar]_button]:size-6',
    );
  });

  it('rules off every section but the first and spaces rows 4px apart', () => {
    render(<Harness initial="c-n" />);
    for (const section of sections()) {
      expect(section).toHaveClass('border-t', 'first:border-t-0', 'pt-2', 'first:pt-0');
      expect(section.querySelector('[data-slot="foldable-section-rows"]')).toHaveClass('gap-1');
    }
    expect(sections()).toHaveLength(3);
  });
});

describe('collapsible inspector sections (doc 252 rules 7-8)', () => {
  it('renders each heading as an expanded button controlling its rows', () => {
    render(<Harness initial="c-n" />);
    for (const name of ['General', 'Validation', 'Appearance']) {
      const button = heading(name);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      const rows = document.getElementById(button.getAttribute('aria-controls')!)!;
      expect(rows).toHaveAttribute('data-slot', 'foldable-section-rows');
      // The chevron sits at the RIGHT end of a full-width heading.
      expect(button).toHaveClass('w-full', 'justify-between');
      expect(button.lastElementChild?.tagName).toBe('svg');
      expect(button.firstElementChild).toHaveTextContent(new RegExp(`^${name}$`, 'i'));
      expect(rows).not.toHaveAttribute('hidden');
    }
  });

  it('folds and unfolds a section on press, by keyboard too', async () => {
    const user = userEvent.setup();
    render(<Harness initial="c-n" />);
    const validation = within(sections()[1]!);
    expect(validation.getByRole('textbox', { name: 'Minimum' })).toBeInTheDocument();

    await user.click(heading('Validation'));
    expect(heading('Validation')).toHaveAttribute('aria-expanded', 'false');
    expect(within(sections()[1]!).queryByRole('textbox', { name: 'Minimum' })).toBeNull();
    // The others are untouched.
    expect(heading('General')).toHaveAttribute('aria-expanded', 'true');

    heading('Validation').focus();
    await user.keyboard('{Enter}');
    expect(heading('Validation')).toHaveAttribute('aria-expanded', 'true');
    expect(within(sections()[1]!).getByRole('textbox', { name: 'Minimum' })).toBeInTheDocument();
  });

  it('keeps a folded section folded when another element is inspected', async () => {
    const user = userEvent.setup();
    render(<Harness initial="c-n" />);
    await user.click(heading('Appearance'));
    fireEvent.click(screen.getByRole('button', { name: 'pick bio' }));
    expect(document.querySelector('[data-slot="inspector-kind"]')).toHaveTextContent(/^Text area$/);
    expect(heading('Appearance')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('textbox', { name: 'Placeholder' })).toBeNull();
    expect(heading('General')).toHaveAttribute('aria-expanded', 'true');
  });
});
