import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as defaults from '../src/renderers/default/index';
import { compileRule } from '../src/studio/rules/rule-compile';

const SCHEMA = {
  type: 'object',
  properties: {
    region: { type: 'string', oneOf: [{ const: 'north' }, { const: 'coast' }] },
    name: { type: 'string', title: 'Name' },
  },
};
const kinds = new Map([['region', 'choice' as const]]);
const ruleFor = (effect: 'SHOW' | 'HIDE' | 'ENABLE' | 'DISABLE') =>
  compileRule(
    {
      effect,
      match: 'all',
      clauses: [{ id: 'k', field: 'region', operator: 'equals', value: 'north' }],
    },
    kinds,
  );

function renderWith(effect: 'SHOW' | 'HIDE' | 'ENABLE' | 'DISABLE', region?: string) {
  return render(
    <JsonForms
      schema={SCHEMA}
      uischema={{ type: 'Control', scope: '#/properties/name', rule: ruleFor(effect) } as never}
      data={region === undefined ? {} : { region }}
      renderers={defaults.renderers}
      cells={defaults.cells}
    />,
  );
}

describe('rules in the default renderers (doc 256 rule 1)', () => {
  it('hides, shows, disables and enables elements from answers', () => {
    const cases = [
      ['SHOW', undefined, false],
      ['SHOW', 'coast', false],
      ['SHOW', 'north', true],
      ['HIDE', 'north', false],
      ['HIDE', undefined, true],
    ] as const;
    for (const [effect, region, shown] of cases) {
      const { unmount } = renderWith(effect, region);
      expect(screen.queryByRole('textbox', { name: 'Name' }) !== null, `${effect} ${region}`).toBe(
        shown,
      );
      unmount();
    }
    const disabled = renderWith('DISABLE', 'north');
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeDisabled();
    disabled.unmount();
    renderWith('ENABLE', 'coast');
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeDisabled();
  });
});
