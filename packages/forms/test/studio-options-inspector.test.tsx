import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderSeededStudio } from './render-studio';

// Doc 206 rules 1-5 — the read-only Options section at the bottom of the inspector.
//
// JSDOM TRAP (CLAUDE.md): the right panel renders the inspector even while closed, so canvas queries are
// scoped to the centre panel and inspector queries to `[data-studio-inspector]`.

const canvas = () => {
  const node = document.querySelector<HTMLElement>('[data-slot="form-studio-center-panel"]');
  if (!node) throw new Error('no centre panel');
  return within(node);
};
const inspector = () => {
  const node = document.querySelector<HTMLElement>('[data-studio-inspector]');
  if (!node) throw new Error('no inspector');
  return within(node);
};
const section = () => {
  const node = document.querySelector<HTMLElement>('[data-slot="inspector-options"]');
  if (!node) throw new Error('no Options section');
  return node;
};

const itemOf = (element: Element) => {
  const item = element.closest<HTMLElement>('[data-slot="studio-grid-item"]');
  if (!item) throw new Error('not inside a studio grid item');
  return item;
};

/** Selects a canvas field by its accessible name (a required field's label carries an asterisk). */
const selectField = (role: string, name: RegExp) => {
  const item = itemOf(canvas().getByRole(role, { name }));
  fireEvent.pointerDown(item);
  fireEvent.pointerUp(document);
  return item;
};

describe('which fields get an Options section (rule 1)', () => {
  it('shows it for a radio group', () => {
    renderSeededStudio();
    selectField('radiogroup', /^Preferred contact method/);
    expect(within(section()).getByRole('button', { name: 'Edit options' })).toBeInTheDocument();
  });

  it('shows it for a single-choice combobox', () => {
    renderSeededStudio();
    selectField('combobox', /^Province/);
    expect(within(section()).getByRole('button', { name: 'Edit options' })).toBeInTheDocument();
  });

  it('shows it for a multi-choice field', () => {
    renderSeededStudio();
    selectField('combobox', /^Supports needed/);
    expect(within(section()).getByRole('button', { name: 'Edit options' })).toBeInTheDocument();
  });

  it('does NOT show it for a text field', () => {
    renderSeededStudio();
    selectField('textbox', /^Name/);
    expect(document.querySelector('[data-slot="inspector-options"]')).toBeNull();
  });

  it('does NOT show it for a number field with no choices', () => {
    renderSeededStudio();
    // Doc 204: a number field renders as a MASKED TEXT input with a hidden number input behind it, so its
    // role is `textbox` — there is no spinbutton on this canvas.
    selectField('textbox', /^Quantity/);
    expect(document.querySelector('[data-slot="inspector-options"]')).toBeNull();
  });
});

describe('the summary (rules 3-4)', () => {
  it('counts the options and lists the first four, label and value', () => {
    renderSeededStudio();
    selectField('combobox', /^Province/);
    const panel = within(section());
    expect(panel.getByText('13 options')).toBeInTheDocument();
    expect(panel.getByText('Alberta')).toBeInTheDocument();
    expect(panel.getByText('AB')).toBeInTheDocument();
    expect(panel.queryByText('Ontario')).toBeNull();
  });

  it('shows an overflow row for the rest', () => {
    renderSeededStudio();
    selectField('combobox', /^Province/);
    expect(within(section()).getByText('+9 more')).toBeInTheDocument();
  });

  it('shows no overflow row when the list fits', () => {
    renderSeededStudio();
    selectField('radiogroup', /^Preferred contact method/);
    const panel = within(section());
    expect(panel.getByText('3 options')).toBeInTheDocument();
    expect(panel.queryByText(/more$/)).toBeNull();
  });

  it('shows a numeric value as a number (rule 17)', () => {
    renderSeededStudio();
    selectField('combobox', /^Team size/);
    expect(within(section()).getByText('Just me')).toBeInTheDocument();
    expect(within(section()).getByText('1')).toBeInTheDocument();
  });

  it('is read-only — it offers no inputs of its own (rule 3)', () => {
    renderSeededStudio();
    selectField('combobox', /^Province/);
    expect(within(section()).queryAllByRole('textbox')).toHaveLength(0);
  });

  it('names the field and its component under the heading', () => {
    renderSeededStudio();
    selectField('combobox', /^Supports needed/);
    expect(within(section()).getByText(/Multi-select/)).toBeInTheDocument();
  });
});

describe('opening the dialog (rule 5)', () => {
  it('opens it from the Edit options button', () => {
    renderSeededStudio();
    selectField('combobox', /^Province/);
    fireEvent.click(within(section()).getByRole('button', { name: 'Edit options' }));
    expect(screen.getByRole('dialog', { name: /Options/ })).toBeInTheDocument();
  });

  it('shows the double-click hint', () => {
    renderSeededStudio();
    selectField('combobox', /^Province/);
    expect(within(section()).getByText(/double-click the field/i)).toBeInTheDocument();
  });

  it('opens the SAME dialog from a double-click on the canvas (rule 5)', () => {
    renderSeededStudio();
    const item = selectField('combobox', /^Province/);
    fireEvent.doubleClick(item);
    expect(screen.getByRole('dialog', { name: /Options/ })).toBeInTheDocument();
  });

  it('ignores a double-click on a field that has no options (rule 6)', () => {
    renderSeededStudio();
    const item = selectField('textbox', /^Name/);
    fireEvent.doubleClick(item);
    expect(screen.queryByRole('dialog', { name: /^Options/ })).toBeNull();
  });

  it('leaves the element selected after a double-click (rule 6)', () => {
    renderSeededStudio();
    const item = selectField('combobox', /^Province/);
    fireEvent.doubleClick(item);
    expect(inspector().getByText('Province')).toBeInTheDocument();
  });
});
