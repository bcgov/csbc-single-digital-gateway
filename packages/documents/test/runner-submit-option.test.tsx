import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DocumentRunner } from '../src/runner';
import { control, edge, form, funnel } from './funnel-fixtures';

// Doc 281 rule 21a: a host that publishes elsewhere hides the runner's final Submit, keeping Back / Next / Save draft.

const SCHEMA = { type: 'object', properties: { name: { type: 'string', title: 'Name' } } };
const FORM = (id: string, label: string) => ({
  type: 'Form',
  label,
  options: { id },
  elements: [{ type: 'Control', scope: '#/properties/name' }],
});
const FUNNEL = funnel(
  [form('a', 'First', [control('name')]), form('b', 'Second', [control('name')])],
  [edge('e1', 'a', 'b')],
);

describe('DocumentRunner submit option (doc 281 rule 21a)', () => {
  it('hides Submit on a Form root with submit={false}, keeping Save draft', async () => {
    const onSaveDraft = vi.fn();
    render(
      <DocumentRunner
        schema={SCHEMA}
        uischema={FORM('a', 'Only')}
        data={{ name: 'x' }}
        onChange={() => {}}
        onSaveDraft={onSaveDraft}
        submit={false}
      />,
    );
    expect(document.querySelector('[data-slot="runner-submit"]')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(onSaveDraft).toHaveBeenCalledWith({ name: 'x' });
  });

  it('keeps Submit by default', () => {
    render(
      <DocumentRunner schema={SCHEMA} uischema={FORM('a', 'Only')} data={{}} onChange={() => {}} />,
    );
    expect(document.querySelector('[data-slot="runner-submit"]')).not.toBeNull();
  });

  it('keeps Next on a Funnel and hides only the final Submit', async () => {
    render(
      <DocumentRunner
        schema={SCHEMA}
        uischema={FUNNEL}
        data={{}}
        onChange={() => {}}
        submit={false}
      />,
    );
    // Through both Forms to the summary page at the end.
    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('button', { name: 'Back' })).toBeEnabled();
    expect(document.querySelector('[data-slot="runner-submit"]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });
});
