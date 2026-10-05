import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { stripRules } from '../src/studio/rules/strip-rules';
import { renderStudioRenderers } from './render-studio-renderers';

const RULE = {
  effect: 'SHOW',
  condition: { scope: '#/properties/region', schema: { const: 'north' }, failWhenUndefined: true },
};
const SCHEMA = {
  type: 'object',
  properties: {
    region: { type: 'string', title: 'Region' },
    name: { type: 'string', title: 'Name' },
  },
};
const page = (withRule: boolean) => ({
  id: 'root',
  type: 'Form',
  elements: [
    { id: 'c-region', type: 'Control', scope: '#/properties/region' },
    { id: 'c-name', type: 'Control', scope: '#/properties/name', ...(withRule && { rule: RULE }) },
  ],
});
const element = (container: HTMLElement, id: string) =>
  container.querySelector<HTMLElement>(`[data-slot="studio-element"][data-element-id="${id}"]`)!;

describe('studio element rules (doc 256 rules 6-9)', () => {
  it('puts Rules first in the action bar, pressed white on blue when the element has a rule', () => {
    const { container, editRule } = renderStudioRenderers(stripRules(page(true)), {
      schema: SCHEMA,
      removable: true,
      ruleProblems: () => [],
    });
    const bar = within(element(container, 'c-name')).getByRole('group', {
      name: 'Element actions',
    });
    const buttons = within(bar).getAllByRole('button');
    expect(buttons[0]).toHaveAccessibleName('Rules for Name');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[0]).toHaveClass('bg-bcgov-blue', 'text-primary-foreground');
    expect(
      within(element(container, 'c-region')).getByRole('button', { name: 'Rules for Region' }),
    ).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(buttons[0]!);
    expect(editRule).toHaveBeenCalledWith('c-name');
  });

  it('disables Rules on an element with no field above it, unless it already has a rule (rule 9b)', () => {
    const { container, editRule } = renderStudioRenderers(stripRules(page(false)), {
      schema: SCHEMA,
      ruleProblems: () => [],
      canAddRule: (id) => id !== 'c-region',
    });
    const region = within(element(container, 'c-region')).getByRole('button', {
      name: 'Rules for Region',
    });
    expect(region).toBeDisabled();
    expect(region).toHaveAttribute('title', 'Add a field above this element to give it a rule');
    fireEvent.click(region);
    expect(editRule).not.toHaveBeenCalled();
    expect(
      within(element(container, 'c-name')).getByRole('button', { name: 'Rules for Name' }),
    ).toBeEnabled();

    const withRule = renderStudioRenderers(stripRules(page(true)), {
      schema: SCHEMA,
      ruleProblems: () => [],
      canAddRule: () => false,
    });
    expect(
      within(element(withRule.container, 'c-name')).getByRole('button', { name: 'Rules for Name' }),
    ).toBeEnabled();
  });

  it('pins a white-on-blue branch badge on an element with a rule', () => {
    const { container } = renderStudioRenderers(stripRules(page(true)), {
      schema: SCHEMA,
      ruleProblems: () => [],
    });
    const badge = element(container, 'c-name').querySelector(
      ':scope > [data-slot="studio-rule-badge"]',
    )!;
    expect(badge).toHaveClass('absolute', '-top-2', '-right-2', 'bg-bcgov-blue', 'text-white');
    expect(badge).toHaveAccessibleName('Shown when…');
    expect(
      element(container, 'c-region').querySelector('[data-slot="studio-rule-badge"]'),
    ).toBeNull();
  });

  it('draws an element whose rule tests a later field in the error state', () => {
    const { container } = renderStudioRenderers(stripRules(page(true)), {
      schema: SCHEMA,
      ruleProblems: (id) => (id === 'c-name' ? ['region'] : []),
    });
    const name = element(container, 'c-name');
    expect(name).toHaveAttribute('data-rule-error', '');
    expect(name).toHaveClass('data-[rule-error]:outline-warning-border');
    const badge = name.querySelector('[data-slot="studio-rule-badge"]')!;
    expect(badge).toHaveClass('bg-warning-surface', 'text-icon-warning');
    expect(badge).toHaveAccessibleName('This rule tests a field that comes after it');
    expect(element(container, 'c-region')).not.toHaveAttribute('data-rule-error');
  });

  it('never hides or disables an element on the canvas because of its rule', () => {
    const disabling = {
      ...page(false),
      elements: [
        {
          id: 'c-name',
          type: 'Control',
          scope: '#/properties/name',
          rule: { ...RULE, effect: 'HIDE' },
        },
      ],
    };
    expect(stripRules(disabling).elements).toEqual([
      {
        id: 'c-name',
        type: 'Control',
        scope: '#/properties/name',
        'x-studio-rule': { ...RULE, effect: 'HIDE' },
      },
    ]);
    const unruled = page(false);
    expect(stripRules(unruled)).toBe(unruled);
    const { container } = renderStudioRenderers(stripRules(page(true)), {
      schema: SCHEMA,
      ruleProblems: () => [],
    });
    // A SHOW rule with no answer would hide it; on the canvas it is drawn.
    expect(within(element(container, 'c-name')).getByText('Name')).toBeInTheDocument();
    expect(screen.queryAllByRole('textbox').length).toBe(2);
  });
});
