import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CriterionField } from '../src/studio/criteria';
import { RuleDialog, type RuleTarget } from '../src/studio/rules/rule-dialog';

const SOURCES: CriterionField[] = [
  { key: 'age', label: 'Age', kind: 'number' },
  { key: 'region', label: 'Region', kind: 'choice', options: [{ value: 'north', label: 'North' }] },
];

function open(target: Partial<RuleTarget> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <RuleDialog
      target={{ id: 'e', name: 'I agree', rule: undefined, sources: SOURCES, ...target }}
      onSave={onSave}
      onClose={onClose}
    />,
  );
  return { onSave, onClose, user: userEvent.setup(), dialog: within(screen.getByRole('dialog')) };
}

const conditions = () =>
  within(screen.getByRole('list', { name: 'Conditions' })).getAllByRole('listitem');

describe('RuleDialog (doc 256 rules 10-12)', () => {
  it('opens a new rule as Show, all, on the nearest field above', () => {
    const { dialog } = open();
    expect(dialog.getByRole('heading', { name: 'Rule' })).toBeInTheDocument();
    expect(dialog.getByText('I agree')).toBeInTheDocument();
    expect(dialog.getByRole('combobox', { name: 'Effect' })).toHaveValue('SHOW');
    expect(conditions()).toHaveLength(1);
    expect(dialog.getByRole('combobox', { name: 'Field' })).toHaveValue('region');
    expect(dialog.getByRole('combobox', { name: 'Value' })).toHaveValue('north');
    expect(dialog.queryByRole('button', { name: 'Remove rule' })).toBeNull();
  });

  it('shows match only with two or more clauses', async () => {
    const { dialog, user } = open();
    expect(dialog.queryByRole('combobox', { name: 'Match' })).toBeNull();
    await user.click(dialog.getByRole('button', { name: 'Add condition' }));
    expect(conditions()).toHaveLength(2);
    expect(dialog.getByRole('combobox', { name: 'Match' })).toHaveValue('all');
  });

  it('saves the compiled rule and removes it with Remove rule', async () => {
    const first = open();
    await first.user.selectOptions(first.dialog.getByRole('combobox', { name: 'Effect' }), 'HIDE');
    await first.user.click(first.dialog.getByRole('button', { name: 'Save' }));
    expect(first.onSave).toHaveBeenCalledWith({
      effect: 'HIDE',
      condition: {
        scope: '#/properties/region',
        schema: { const: 'north' },
        failWhenUndefined: true,
      },
    });

    cleanup();
    const existing = open({ rule: first.onSave.mock.calls[0]![0] });
    expect(existing.dialog.getByRole('combobox', { name: 'Effect' })).toHaveValue('HIDE');
    await existing.user.click(existing.dialog.getByRole('button', { name: 'Remove rule' }));
    expect(existing.onSave).toHaveBeenCalledWith(undefined);
  });

  it('disables Save with no sources, or a clause missing its value', async () => {
    const none = open({ sources: [] });
    expect(
      none.dialog.getByText('No fields come before this element to test.'),
    ).toBeInTheDocument();
    expect(none.dialog.getByRole('button', { name: 'Save' })).toBeDisabled();

    cleanup();
    const { dialog, user } = open();
    await user.selectOptions(dialog.getByRole('combobox', { name: 'Field' }), 'age');
    const value = dialog.getByRole('spinbutton', { name: 'Value' });
    await user.clear(value);
    expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('offers only Remove and Cancel for a rule it cannot read', () => {
    const { dialog } = open({
      rule: { effect: 'SHOW', condition: { scope: '#/properties/age', expectedValue: 1 } },
    });
    expect(dialog.getByText(/Custom rule/)).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Remove rule' })).toBeInTheDocument();
    expect(dialog.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(dialog.queryByRole('combobox', { name: 'Effect' })).toBeNull();
  });
});
