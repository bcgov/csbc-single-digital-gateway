import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DocumentRunner } from '../src/runner';
import { control, edge, form, funnel } from './funnel-fixtures';

// Doc 281 rule 21c: staff on the service edit page move through a Funnel freely — errors still show, never block.

const SCHEMA = {
  type: 'object',
  properties: { name: { type: 'string', title: 'Name' }, note: { type: 'string', title: 'Note' } },
  required: ['name'],
};
const FUNNEL = funnel(
  [form('a', 'First', [control('name')]), form('b', 'Second', [control('note')])],
  [edge('e1', 'a', 'b')],
);
const button = (name: string) => screen.queryByRole('button', { name });

describe('DocumentRunner freeNavigation (doc 281 rule 21c)', () => {
  it('gates Next on an errored step by default', async () => {
    render(<DocumentRunner schema={SCHEMA} uischema={FUNNEL} data={{}} onChange={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('lets Next past an errored step with freeNavigation, reaching the next Form', async () => {
    render(
      <DocumentRunner
        schema={SCHEMA}
        uischema={FUNNEL}
        data={{}}
        onChange={() => {}}
        freeNavigation
      />,
    );
    const next = await screen.findByRole('button', { name: 'Next' });
    expect(next).toBeEnabled();
    await userEvent.click(next);
    expect(await screen.findByRole('heading', { name: 'Second' })).toBeInTheDocument();
    expect(button('Back')).toBeEnabled();
  });
});
