import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DocumentStudio } from '../src/studio';
import type { DocumentContent } from '../src/studio/document-types';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

// Doc 282 rules 14-17: the studio's View mode — the document read back with its own answers.

const CONTENT: DocumentContent = {
  schema: { type: 'object', properties: { name: { type: 'string', title: 'Name' } } },
  variants: {
    default: {
      id: 'F',
      type: 'Form',
      label: 'Permit',
      elements: [{ id: 'n', type: 'Control', scope: '#/properties/name' }],
    },
  },
  data: { name: 'Ada' },
};

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const modes = () =>
  within(slot('document-studio-mode')!)
    .getAllByRole('button')
    .map((button) => button.textContent);
const toggle = (name: string) =>
  within(slot('document-studio-mode')!).getByRole('button', { name });

function open({ fillable = true, readOnly = false } = {}) {
  render(
    <DocumentStudio
      content={CONTENT}
      kind="document"
      type="services.service"
      fillable={fillable}
      readOnly={readOnly}
    />,
  );
}

describe('studio View mode (doc 282 rules 14-17)', () => {
  it('offers Edit | Preview | View in a fillable studio, and View reads the answers back', async () => {
    open();
    await screen.findByRole('article', { name: 'Permit page' });
    expect(modes()).toEqual(['Edit', 'Preview', 'View']);
    await userEvent.click(toggle('View'));
    expect(toggle('View')).toHaveAttribute('aria-pressed', 'true');
    const view = slot('document-view')!;
    expect(within(view).getByText('Ada')).toBeInTheDocument();
    expect(within(view).queryByRole('textbox')).toBeNull();
    // View selects nothing: no breadcrumbs, no variant management.
    expect(screen.queryByRole('button', { name: 'New variant' })).toBeNull();
  });

  it('offers no View in a studio that is not fillable', async () => {
    open({ fillable: false });
    await screen.findByRole('article', { name: 'Permit page' });
    expect(modes()).toEqual(['Edit', 'Preview']);
  });

  it('opens a read-only fillable studio in View, with Preview | View and no Edit', () => {
    open({ readOnly: true });
    expect(modes()).toEqual(['Preview', 'View']);
    expect(toggle('View')).toHaveAttribute('aria-pressed', 'true');
    expect(within(slot('document-view')!).getByText('Ada')).toBeInTheDocument();
  });
});
