import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OptionsDialog } from '../src/studio/options/options-dialog';
import type { OptionsTarget } from '../src/studio/options/options-target';
import { condition, form, funnel, row } from './funnel-fixtures';

const TARGET: OptionsTarget = {
  elementId: 'c-region',
  propertyKey: 'region',
  label: 'Region',
  fieldName: 'Select',
  multiple: false,
  options: [
    { value: 'north', label: 'North' },
    { value: 'interior', label: 'Interior' },
    { value: 'coast', label: 'Coast' },
  ],
  type: 'string',
};

const UISCHEMA = funnel(
  [form('A', 'A')],
  [],
  [
    condition(
      'c1',
      [
        row('r1', 'Northern', [
          { id: 'k', field: 'region', operator: 'equals', value: 'north' } as never,
        ]),
      ],
      'Where',
    ),
  ],
);

function open(target: OptionsTarget = TARGET) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  render(<OptionsDialog target={target} uischema={UISCHEMA} onSave={onSave} onCancel={onCancel} />);
  return { onSave, onCancel, user: userEvent.setup() };
}

const dialog = () => within(screen.getByRole('dialog'));
const labels = () => dialog().getAllByRole('textbox', { name: /label$/i }) as HTMLInputElement[];
const values = () => dialog().getAllByRole('textbox', { name: /value$/i }) as HTMLInputElement[];
const saveButton = () => dialog().getByRole('button', { name: 'Save options' });
const ready = () => waitFor(() => expect(labels()[0]).toHaveFocus());

describe('list page (doc 255 rules 4-7)', () => {
  it('opens with one row per option, names the field, and focuses the first label', async () => {
    open();
    await ready();
    expect(labels().map((input) => input.value)).toEqual(['North', 'Interior', 'Coast']);
    expect(dialog().getByRole('heading', { name: 'Edit options' })).toBeInTheDocument();
    expect(dialog().getByText('Region · Select')).toBeInTheDocument();
    expect(dialog().getByText('3 options')).toBeInTheDocument();
  });

  it('adds a row below on Enter, slugging its value from the label', async () => {
    const { user } = open();
    await ready();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(labels()[1]).toHaveFocus());
    await user.keyboard('Thompson Okanagan');
    expect(values()[1]!.value).toBe('thompson_okanagan');
    expect(labels()).toHaveLength(4);
  });

  it('blocks Save with the reason for a duplicate value', async () => {
    const { user } = open();
    await ready();
    const coast = values()[2]!;
    coast.focus();
    coast.select();
    await user.keyboard('north');
    expect(saveButton()).toBeDisabled();
    expect(dialog().getByText(/1 duplicate value/)).toBeInTheDocument();
    expect(coast).toHaveAttribute('aria-invalid', 'true');
  });

  it('saves the entries and the renames, and saves on ⌘↵ too', async () => {
    const { user, onSave } = open();
    await ready();
    const north = values()[0]!;
    north.focus();
    north.select();
    await user.keyboard('northern');
    await user.click(saveButton());
    expect(onSave).toHaveBeenCalledWith(
      [
        { const: 'northern', title: 'North' },
        { const: 'interior', title: 'Interior' },
        { const: 'coast', title: 'Coast' },
      ],
      new Map([['north', 'northern']]),
    );
    fireEvent.keyDown(labels()[0]!, { key: 'Enter', metaKey: true });
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it('warns before Save about a deleted value a Condition tests, but still allows it', async () => {
    const { user } = open();
    await ready();
    await user.click(dialog().getByRole('button', { name: 'Remove option 1' }));
    expect(dialog().getByRole('alert')).toHaveTextContent(
      'Removing north will leave Northern (Where) referring to a choice that no longer exists.',
    );
    expect(saveButton()).toBeEnabled();
  });

  it('discards the draft on Cancel', async () => {
    const { user, onCancel, onSave } = open();
    await ready();
    await user.click(dialog().getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('import page (doc 255 rules 8-10)', () => {
  async function toImport(user: ReturnType<typeof userEvent.setup>) {
    await ready();
    await user.click(dialog().getByRole('button', { name: 'Import' }));
    return dialog().getByRole('textbox', { name: 'Paste options to import' });
  }

  it('pushes to an import page with Back, keeping the pasted text across Back', async () => {
    const { user } = open();
    const paste = await toImport(user);
    expect(dialog().getByRole('heading', { name: 'Import options' })).toBeInTheDocument();
    expect(dialog().queryByRole('textbox', { name: /label$/i })).toBeNull();
    expect(dialog().getByRole('button', { name: 'Import 0 options' })).toBeDisabled();
    await user.type(paste, 'Kootenay{Enter}Cariboo');
    expect(dialog().getByRole('button', { name: 'Import 2 options' })).toBeEnabled();

    await user.click(dialog().getByRole('button', { name: 'Back to options' }));
    expect(labels()).toHaveLength(3);
    await user.click(dialog().getByRole('button', { name: 'Import' }));
    expect(dialog().getByRole('textbox', { name: 'Paste options to import' })).toHaveValue(
      'Kootenay\nCariboo',
    );
  });

  it('appends by default, skipping a header row, then returns to the list', async () => {
    const { user } = open();
    const paste = await toImport(user);
    await user.type(paste, 'Label,Value{Enter}Kootenay,koot');
    await user.click(dialog().getByRole('button', { name: 'Import 1 option' }));
    expect(labels().map((input) => input.value)).toEqual([
      'North',
      'Interior',
      'Coast',
      'Kootenay',
    ]);
    expect(values()[3]!.value).toBe('koot');
    await waitFor(() => expect(labels()[3]).toHaveFocus());
  });

  it('replaces the rows, keeping identity by value so nothing reads as deleted', async () => {
    const { user, onSave } = open();
    const paste = await toImport(user);
    await user.click(dialog().getByRole('button', { name: 'Replace' }));
    await user.type(paste, 'North,north{Enter}Kootenay,kootenay');
    await user.click(dialog().getByRole('button', { name: 'Import 2 options' }));
    expect(labels().map((input) => input.value)).toEqual(['North', 'Kootenay']);
    // `north` survived the replace, so the Condition that tests it is not stranded.
    expect(dialog().queryByRole('alert')).toBeNull();
    await user.click(saveButton());
    expect(onSave.mock.calls[0]![1]).toEqual(new Map());
  });
});
