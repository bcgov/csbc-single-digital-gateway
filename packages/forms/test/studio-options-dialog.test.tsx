import type { UISchemaElement } from '@jsonforms/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OptionsDialog } from '../src/studio/options/options-dialog';
import type { OptionsTarget } from '../src/studio/options/options-target';
import { renderSeededStudio } from './render-studio';

// Doc 206 rules 5-25 — the Edit Options dialog, end to end in the studio.
//
// JSDOM TRAP (CLAUDE.md): react-resizable-panels prevents default on every pointerdown, so inputs are
// focused programmatically and typed with `skipClick`.

const canvas = () => {
  const node = document.querySelector<HTMLElement>('[data-slot="form-studio-center-panel"]');
  if (!node) throw new Error('no centre panel');
  return within(node);
};
const dialog = () => within(screen.getByRole('dialog', { name: /Options/ }));
const valueInputs = () => dialog().getAllByRole('textbox', { name: /value$/i });
const labelInputs = () => dialog().getAllByRole('textbox', { name: /label$/i });
const save = () => dialog().getByRole('button', { name: /^Save options/ });

const itemOf = (element: Element) => {
  const item = element.closest<HTMLElement>('[data-slot="studio-grid-item"]');
  if (!item) throw new Error('not inside a studio grid item');
  return item;
};

/**
 * Selects a canvas field and opens its options dialog.
 *
 * TRAP: Base UI moves focus into the popup ASYNCHRONOUSLY after open, so any `focus()` call made before that
 * lands is silently overridden and every later keystroke goes to the dialog's initial-focus element instead.
 * Waiting for the first Label to hold focus is what makes typing in any other field work at all.
 */
const openFor = async (role: string, name: RegExp) => {
  const item = itemOf(canvas().getByRole(role, { name }));
  fireEvent.pointerDown(item);
  fireEvent.pointerUp(document);
  fireEvent.doubleClick(item);
  await waitFor(() => expect(labelInputs()[0]).toHaveFocus());
  return item;
};

/** Replaces an input's text, as an author would (see the trap above). */
async function retype(
  user: ReturnType<typeof userEvent.setup>,
  input: HTMLInputElement,
  text: string,
) {
  input.focus();
  input.setSelectionRange(0, input.value.length);
  await user.type(input, text, { skipClick: true });
}

describe('the draft (rules 9-10)', () => {
  it('opens with one row per option, in order', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    expect(labelInputs().map((input) => (input as HTMLInputElement).value)).toEqual([
      'Email',
      'Phone',
      'Mail',
    ]);
  });

  it('names the field and its component in the subline', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    expect(dialog().getByText(/Preferred contact method/)).toBeInTheDocument();
  });

  it('discards every change on Cancel (rule 9)', async () => {
    const user = userEvent.setup();
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    await retype(user, labelInputs()[0] as HTMLInputElement, 'Electronic mail');
    fireEvent.click(dialog().getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Options/ })).toBeNull());
    await openFor('radiogroup', /^Preferred contact method/);
    expect((labelInputs()[0] as HTMLInputElement).value).toBe('Email');
  });

  it('closes on Escape WITHOUT walking the selection up (rule 8)', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    fireEvent.keyDown(screen.getByRole('dialog', { name: /Options/ }), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Options/ })).toBeNull());
    const inspector = document.querySelector<HTMLElement>('[data-studio-inspector]');
    expect(within(inspector!).getByText('Preferred contact method')).toBeInTheDocument();
  });
});

describe('editing rows (rules 11-15)', () => {
  it('slugs the value of a NEW row from its label', async () => {
    const user = userEvent.setup();
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    fireEvent.click(dialog().getByRole('button', { name: /Add option/ }));
    await retype(user, labelInputs().at(-1) as HTMLInputElement, 'Carrier pigeon');
    expect((valueInputs().at(-1) as HTMLInputElement).value).toBe('carrier_pigeon');
  });

  it('leaves an EXISTING row’s value alone when its label changes (rule 10)', async () => {
    const user = userEvent.setup();
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    await retype(user, labelInputs()[0] as HTMLInputElement, 'Electronic mail');
    expect((valueInputs()[0] as HTMLInputElement).value).toBe('email');
  });

  it('inserts a row BELOW the current one on Enter, and focuses it (rule 13)', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    const first = labelInputs()[0] as HTMLInputElement;
    first.focus();
    fireEvent.keyDown(first, { key: 'Enter' });
    await waitFor(() => expect(labelInputs()).toHaveLength(4));
    expect((labelInputs()[1] as HTMLInputElement).value).toBe('');
    expect(document.activeElement).toBe(labelInputs()[1]);
  });

  it('deletes an empty row on Backspace and focuses the one above (rule 14)', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    fireEvent.click(dialog().getByRole('button', { name: /Add option/ }));
    const added = labelInputs().at(-1) as HTMLInputElement;
    added.focus();
    fireEvent.keyDown(added, { key: 'Backspace' });
    await waitFor(() => expect(labelInputs()).toHaveLength(3));
    expect(document.activeElement).toBe(labelInputs()[2]);
  });

  it('does not delete a row that has text in it (rule 14)', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    const first = labelInputs()[0] as HTMLInputElement;
    first.focus();
    fireEvent.keyDown(first, { key: 'Backspace' });
    expect(labelInputs()).toHaveLength(3);
  });

  it('removes a row from its remove button (rule 15)', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    fireEvent.click(dialog().getAllByRole('button', { name: /^Remove/ })[0]!);
    await waitFor(() => expect(labelInputs()).toHaveLength(2));
  });

  it('reorders a row with the up/down buttons (rule 29)', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    fireEvent.click(dialog().getAllByRole('button', { name: /^Move .* down/ })[0]!);
    await waitFor(() =>
      expect(labelInputs().map((input) => (input as HTMLInputElement).value)).toEqual([
        'Phone',
        'Email',
        'Mail',
      ]),
    );
  });
});

describe('problems block Save (rules 17-20)', () => {
  it('marks a duplicate value invalid and disables Save', async () => {
    const user = userEvent.setup();
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    await retype(user, valueInputs()[1] as HTMLInputElement, 'email');
    await waitFor(() => expect(valueInputs()[1]).toHaveAttribute('aria-invalid', 'true'));
    expect(valueInputs()[0]).not.toHaveAttribute('aria-invalid', 'true');
    expect(save()).toBeDisabled();
    expect(dialog().getByText(/1 duplicate value/)).toBeInTheDocument();
  });

  it('marks a non-numeric value invalid on a NUMERIC field (rule 17)', async () => {
    const user = userEvent.setup();
    renderSeededStudio();
    await openFor('combobox', /^Team size/);
    await retype(user, valueInputs()[0] as HTMLInputElement, 'lots');
    await waitFor(() => expect(valueInputs()[0]).toHaveAttribute('aria-invalid', 'true'));
    expect(save()).toBeDisabled();
    // Hand verification found a disabled Save with nothing but a red border to explain it.
    expect(dialog().getByText(/not valid for this field/)).toBeInTheDocument();
  });

  it('accepts the same text on a STRING field', async () => {
    const user = userEvent.setup();
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    await retype(user, valueInputs()[0] as HTMLInputElement, 'lots');
    expect(valueInputs()[0]).not.toHaveAttribute('aria-invalid', 'true');
    expect(save()).toBeEnabled();
  });

  it('disables Save when every row has been removed (rule 19)', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    for (const button of dialog()
      .getAllByRole('button', { name: /^Remove/ })
      .toReversed())
      fireEvent.click(button);
    await waitFor(() => expect(save()).toBeDisabled());
    expect(dialog().getByText(/At least one option/)).toBeInTheDocument();
  });

  it('allows an empty LABEL but not an empty value (rule 20)', async () => {
    const user = userEvent.setup();
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    // An empty LABEL alone is fine: `optionsFrom` falls back to the const (doc 188 rule 2).
    await user.clear(labelInputs()[0] as HTMLInputElement);
    await waitFor(() => expect(save()).toBeEnabled());
    // An empty VALUE on a row that still has a label is not a choice at all.
    await retype(user, labelInputs()[0] as HTMLInputElement, 'Email');
    await user.clear(valueInputs()[0] as HTMLInputElement);
    await waitFor(() => expect(save()).toBeDisabled());
    expect(dialog().getByText(/needs a value/)).toBeInTheDocument();
  });
});

describe('saving (rules 16-19, 26)', () => {
  it('writes the new list to the field, which the canvas then renders', async () => {
    const user = userEvent.setup();
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    await retype(user, labelInputs()[0] as HTMLInputElement, 'Electronic mail');
    fireEvent.click(save());
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Options/ })).toBeNull());
    await openFor('radiogroup', /^Preferred contact method/);
    expect((labelInputs()[0] as HTMLInputElement).value).toBe('Electronic mail');
  });

  it('keeps a numeric field numeric — it still renders its choices afterwards (rule 17)', async () => {
    const user = userEvent.setup();
    renderSeededStudio();
    await openFor('combobox', /^Team size/);
    await retype(user, valueInputs()[0] as HTMLInputElement, '2');
    fireEvent.click(save());
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Options/ })).toBeNull());
    // Still a combobox, not a degraded number input — the proof that `1` was not written as `"1"`.
    expect(canvas().getByRole('combobox', { name: /^Team size/ })).toBeInTheDocument();
  });

  it('writes a MULTI-choice list under items, so the field still renders (rule 26)', async () => {
    const user = userEvent.setup();
    renderSeededStudio();
    await openFor('combobox', /^Supports needed/);
    await retype(user, labelInputs()[0] as HTMLInputElement, 'Step-free access');
    fireEvent.click(save());
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Options/ })).toBeNull());
    expect(canvas().getByRole('combobox', { name: /^Supports needed/ })).toBeInTheDocument();
    await openFor('combobox', /^Supports needed/);
    expect((labelInputs()[0] as HTMLInputElement).value).toBe('Step-free access');
  });

  it('drops a blank row rather than saving it (rule 19)', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    fireEvent.click(dialog().getByRole('button', { name: /Add option/ }));
    fireEvent.click(save());
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Options/ })).toBeNull());
    await openFor('radiogroup', /^Preferred contact method/);
    expect(labelInputs()).toHaveLength(3);
  });
});

const flowWith = (value: unknown): UISchemaElement =>
  ({
    type: 'Flow',
    options: { edges: [] },
    elements: [
      {
        type: 'Condition',
        label: 'How to reach you',
        options: {
          id: 'x',
          rows: [
            {
              id: 'r1',
              label: 'By email',
              match: 'all',
              clauses: [{ id: 'c1', field: 'k1', operator: 'equals', value }],
            },
          ],
        },
      },
    ],
  }) as unknown as UISchemaElement;

describe('condition references (rules 21-23)', () => {
  // The sample is a Form, not a Flow, so the warning is exercised on a hand-built document with the dialog
  // rendered directly — the studio path is already covered by the save tests above.
  const TARGET: OptionsTarget = {
    elementId: 'el-1',
    propertyKey: 'k1',
    label: 'Preferred contact method',
    fieldName: 'Radio group',
    type: 'string',
    options: [
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
    ],
  };
  const renderDialog = (uischema: UISchemaElement, onSave = () => {}) =>
    render(
      <OptionsDialog target={TARGET} uischema={uischema} onCancel={() => {}} onSave={onSave} />,
    );

  it('names the condition a removed option would strand (rule 23)', async () => {
    renderDialog(flowWith('email'));
    await waitFor(() => expect(labelInputs()[0]).toHaveFocus());
    fireEvent.click(dialog().getAllByRole('button', { name: /^Remove/ })[0]!);
    expect(await dialog().findByText(/By email/)).toBeInTheDocument();
  });

  it('says nothing when the removed option is referenced by nothing', async () => {
    renderDialog(flowWith('phone'));
    await waitFor(() => expect(labelInputs()[0]).toHaveFocus());
    fireEvent.click(dialog().getAllByRole('button', { name: /^Remove/ })[0]!);
    expect(dialog().queryByText(/By email/)).toBeNull();
  });

  it('still allows the save — the studio reports, it never rewrites the logic (rule 23)', async () => {
    const onSave = vi.fn();
    renderDialog(flowWith('email'), onSave);
    await waitFor(() => expect(labelInputs()[0]).toHaveFocus());
    fireEvent.click(dialog().getAllByRole('button', { name: /^Remove/ })[0]!);
    expect(save()).toBeEnabled();
    fireEvent.click(save());
    expect(onSave).toHaveBeenCalledWith([{ const: 'phone', title: 'Phone' }], new Map());
  });

  it('reports a RENAME as a cascade, not as a stranded reference (rules 21-23)', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderDialog(flowWith('email'), onSave);
    await waitFor(() => expect(labelInputs()[0]).toHaveFocus());
    await retype(user, valueInputs()[0] as HTMLInputElement, 'e_mail');
    expect(dialog().queryByText(/By email/)).toBeNull();
    fireEvent.click(save());
    expect(onSave).toHaveBeenCalledWith(
      [
        { const: 'e_mail', title: 'Email' },
        { const: 'phone', title: 'Phone' },
      ],
      new Map([['email', 'e_mail']]),
    );
  });

  it('shows no warning for an ordinary edit', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    expect(dialog().queryByText(/no longer exists/i)).toBeNull();
  });
});

// Doc 208 — bulk edit, import and drag, inside the dialog.

const modeSwitch = () => dialog().getByRole('group', { name: /edit mode/i });
const bulkText = () => dialog().getByRole('textbox', { name: /bulk/i }) as HTMLTextAreaElement;
const toMode = (name: 'List' | 'Bulk') =>
  fireEvent.click(within(modeSwitch()).getByRole('button', { name }));

describe('the List / Bulk switch (rules 1-3)', () => {
  it('starts in List mode', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    expect(within(modeSwitch()).getByRole('button', { name: 'List' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(labelInputs()).toHaveLength(3);
  });

  it('serialises the rows when switching to Bulk (rule 3)', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    toMode('Bulk');
    expect(bulkText().value).toBe('Email | email\nPhone | phone\nMail | mail');
  });

  it('parses the text back when switching to List', async () => {
    const user = userEvent.setup();
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    toMode('Bulk');
    await retype(user, bulkText() as unknown as HTMLInputElement, 'One | one\nTwo | two');
    toMode('List');
    expect(labelInputs().map((input) => (input as HTMLInputElement).value)).toEqual(['One', 'Two']);
  });

  it('stays in its mode when the active segment is pressed again (rule 2)', async () => {
    // Base UI reports an EMPTY array on re-press; unguarded, the dialog would show neither mode.
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    toMode('Bulk');
    toMode('Bulk');
    expect(bulkText()).toBeInTheDocument();
  });

  it('does not lose a row edited in List after a trip through Bulk (rule 5)', async () => {
    const user = userEvent.setup();
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    await retype(user, labelInputs()[0] as HTMLInputElement, 'Electronic mail');
    toMode('Bulk');
    toMode('List');
    expect((labelInputs()[0] as HTMLInputElement).value).toBe('Electronic mail');
  });
});

describe('the import strip (rules 8-13)', () => {
  const importToggle = () => dialog().getByRole('button', { name: /^Import/ });
  const importText = () => dialog().getByRole('textbox', { name: /paste/i }) as HTMLTextAreaElement;
  const importConfirm = () => dialog().getByRole('button', { name: /^Import \d+/ });

  it('is closed until asked for', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    expect(dialog().queryByRole('textbox', { name: /paste/i })).toBeNull();
  });

  it('disables Import until something parses (rule 12)', async () => {
    const user = userEvent.setup();
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    fireEvent.click(importToggle());
    expect(importConfirm()).toBeDisabled();
    await retype(user, importText() as unknown as HTMLInputElement, 'Fax,fax');
    await waitFor(() => expect(importConfirm()).toBeEnabled());
    expect(importConfirm()).toHaveTextContent('Import 1');
  });

  it('APPENDS by default, keeping the existing rows (rule 11)', async () => {
    const user = userEvent.setup();
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    fireEvent.click(importToggle());
    await retype(user, importText() as unknown as HTMLInputElement, 'Fax,fax');
    fireEvent.click(importConfirm());
    await waitFor(() => expect(labelInputs()).toHaveLength(4));
    expect((labelInputs()[3] as HTMLInputElement).value).toBe('Fax');
  });

  it('REPLACES when asked, and keeps the id of a value that survives (rules 5, 11)', async () => {
    const user = userEvent.setup();
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    fireEvent.click(importToggle());
    fireEvent.click(
      within(dialog().getByRole('group', { name: /import mode/i })).getByRole('button', {
        name: 'Replace',
      }),
    );
    await retype(user, importText() as unknown as HTMLInputElement, 'Email,email\nFax,fax');
    fireEvent.click(importConfirm());
    await waitFor(() => expect(labelInputs()).toHaveLength(2));
    // `email` survived, so no delete is warned for it.
    expect(dialog().queryByText(/no longer exists/i)).toBeNull();
  });

  it('closes the strip after importing (rule 13)', async () => {
    const user = userEvent.setup();
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    fireEvent.click(importToggle());
    await retype(user, importText() as unknown as HTMLInputElement, 'Fax,fax');
    fireEvent.click(importConfirm());
    await waitFor(() => expect(dialog().queryByRole('textbox', { name: /paste/i })).toBeNull());
  });
});

describe('drag reorder (rules 14-17)', () => {
  it('gives each row a drag handle, and drags from it alone (rule 15)', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    const handles = dialog().getAllByRole('button', { name: /^Reorder/ });
    expect(handles).toHaveLength(3);
    expect(handles[0]).toHaveAttribute('draggable', 'true');
    // The inputs must stay selectable, so they are never draggable.
    expect(labelInputs()[0]).not.toHaveAttribute('draggable', 'true');
  });

  it('keeps the up/down buttons as the keyboard path (rule 16)', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    expect(dialog().getAllByRole('button', { name: /^Move .* down/ })).toHaveLength(3);
  });
});

describe('Bulk mode commits through List (rule 19)', () => {
  it('hides + Add option, since the text IS the list', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    toMode('Bulk');
    expect(dialog().queryByRole('button', { name: /Add option/ })).toBeNull();
  });

  it('disables Save while Bulk is open, and says why', async () => {
    // The footer reads the DRAFT; in Bulk the draft is only as current as the last parse, so saving here
    // would commit rows the author cannot see and ignore what they just typed.
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    toMode('Bulk');
    expect(save()).toBeDisabled();
    expect(dialog().getByText(/Switch to List/)).toBeInTheDocument();
  });

  it('re-enables Save on returning to List', async () => {
    renderSeededStudio();
    await openFor('radiogroup', /^Preferred contact method/);
    toMode('Bulk');
    toMode('List');
    expect(save()).toBeEnabled();
  });
});
