import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Checkbox } from '@ui/components/ui/checkbox';
import { CheckboxGroup } from '@ui/components/ui/checkbox-group';
import catalog from '@ui/a11y/a11y-catalog.json';
import pkg from '../package.json';

// Doc 205 rules 22-25 — the group owns role, name and invalid; its items own their own labels.

const OPTIONS = [
  { value: 'wheelchair', label: 'Wheelchair access' },
  { value: 'interpreter', label: 'Interpreter' },
  { value: 'braille', label: 'Braille' },
];

function TestGroup({
  invalid,
  disabled,
  onValueChange,
}: {
  invalid?: boolean;
  disabled?: boolean;
  onValueChange?: (value: string[]) => void;
} = {}) {
  const [value, setValue] = useState<string[]>(['interpreter']);
  return (
    <>
      <span id="supports-label">Supports needed</span>
      <CheckboxGroup
        aria-labelledby="supports-label"
        value={value}
        onValueChange={(next) => {
          setValue(next);
          onValueChange?.(next);
        }}
        {...(invalid ? { invalid: true } : {})}
        {...(disabled ? { disabled: true } : {})}
      >
        {OPTIONS.map((option) => (
          <span key={option.value}>
            <Checkbox id={option.value} value={option.value} />
            <label htmlFor={option.value}>{option.label}</label>
          </span>
        ))}
      </CheckboxGroup>
    </>
  );
}

describe('CheckboxGroup (rules 22-23)', () => {
  it('renders a named group containing its checkboxes', () => {
    render(<TestGroup />);
    const group = screen.getByRole('group', { name: 'Supports needed' });
    expect(group).toBeInTheDocument();
    expect(within(group).getAllByRole('checkbox')).toHaveLength(3);
  });

  it('marks the container with data-slot="checkbox-group", which field.tsx styles', () => {
    render(<TestGroup />);
    expect(screen.getByRole('group')).toHaveAttribute('data-slot', 'checkbox-group');
  });

  it('ticks the boxes named by its value', () => {
    render(<TestGroup />);
    expect(screen.getByRole('checkbox', { name: 'Interpreter' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Wheelchair access' })).not.toBeChecked();
  });

  it('reports the checked values through onValueChange', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestGroup onValueChange={onValueChange} />);

    await user.click(screen.getByRole('checkbox', { name: 'Braille' }));

    expect(onValueChange).toHaveBeenCalledWith(expect.arrayContaining(['interpreter', 'braille']));
    expect(screen.getByRole('checkbox', { name: 'Braille' })).toBeChecked();
  });

  it('sets aria-invalid on the CONTAINER only, never on the items (rule 20)', () => {
    // The whole set being under-filled is not a fault of any one box, and Checkbox's own destructive
    // styling fires on the item alone — so propagating it would redden boxes for no reason.
    render(<TestGroup invalid />);
    expect(screen.getByRole('group')).toHaveAttribute('aria-invalid', 'true');
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).not.toHaveAttribute('aria-invalid');
    }
  });

  it('carries no aria-invalid when valid', () => {
    render(<TestGroup />);
    expect(screen.getByRole('group')).not.toHaveAttribute('aria-invalid');
  });

  it('disables every item when the group is disabled — so a caller sets it ONCE', () => {
    // Base UI propagates down: the visible span gets aria-disabled + tabindex -1 and the hidden input gets
    // the disabled attribute. `toBeDisabled` alone would miss it, since the ARIA checkbox is a span.
    render(<TestGroup disabled />);
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toHaveAttribute('aria-disabled', 'true');
      expect(box).toHaveAttribute('tabindex', '-1');
    }
    for (const input of document.querySelectorAll('input[type="checkbox"]')) {
      expect(input).toBeDisabled();
    }
  });
});

describe('exports and catalogue (rule 25)', () => {
  it('is exported as @repo/ui/checkbox-group through the GENERATED map', () => {
    const exportsMap = pkg.exports as Record<string, Record<string, string>>;
    expect(exportsMap['./checkbox-group']).toEqual({
      types: './dist/checkbox-group.d.ts',
      development: './src/checkbox-group.ts',
      import: './dist/checkbox-group.js',
      require: './dist/checkbox-group.cjs',
    });
    expect(
      readFileSync(resolve(import.meta.dirname, '../src/checkbox-group.ts'), 'utf8'),
    ).toContain('checkbox-group');
  });

  it('has an a11y catalogue entry, where the catalogue once documented its absence', () => {
    const entry = (catalog as { component: string }[]).find(
      (component) => component.component === 'checkbox-group',
    );
    expect(entry).toBeDefined();
  });
});
