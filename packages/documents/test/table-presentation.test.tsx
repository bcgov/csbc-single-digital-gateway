import { JsonForms } from '@jsonforms/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as defaults from '../src/renderers/default/index';
import * as studio from '../src/renderers/studio/index';
import { StudioEditorProvider, type ElementPatch } from '../src/renderers/studio/index';
import { governanceOf } from '../src/studio/capabilities/governance';
import type { DocumentContent } from '../src/studio/document-types';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { inspectorForm } from '../src/studio/inspector/inspector-form';
import { inspectorTarget } from '../src/studio/inspector/inspector-target';

const table = (options: Record<string, unknown> = {}) => ({
  id: 'tb',
  type: 'Table',
  options: {
    headers: ['Fee', 'Amount'],
    rows: [
      ['Application', '$25'],
      ['Renewal', '$10'],
    ],
    ...options,
  },
});
const page = (options?: Record<string, unknown>) => ({
  id: 'F',
  type: 'Form',
  elements: [table(options)],
});
const SCHEMA = { type: 'object', properties: {} };

function renderDefault(options: Record<string, unknown>) {
  return render(
    <JsonForms
      schema={SCHEMA}
      uischema={page(options) as never}
      data={{}}
      renderers={defaults.renderers}
      cells={defaults.cells}
    />,
  );
}

function renderStudio(options: Record<string, unknown> = {}) {
  const update = vi.fn<(id: string, patch: ElementPatch) => void>();
  render(
    <StudioEditorProvider update={update} insert={vi.fn()}>
      <JsonForms
        schema={SCHEMA}
        uischema={page(options) as never}
        data={{}}
        renderers={studio.renderers}
        cells={studio.cells}
        validationMode="NoValidation"
      />
    </StudioEditorProvider>,
  );
  return { update };
}

describe('Table presentation (doc 267 rules 4-8)', () => {
  it('draws caption, row headers, alignment and style read-only', () => {
    renderDefault({ caption: 'Fees', rowHeaders: true, align: ['left', 'right'], striped: true });
    const t = screen.getByRole('table', { name: 'Fees' });
    expect(screen.getAllByRole('rowheader').map((th) => th.textContent)).toEqual([
      'Application',
      'Renewal',
    ]);
    expect(within(t).getByRole('cell', { name: '$25' })).toHaveClass('text-right');
    expect(t.className).toContain('nth-child(even)');
  });

  it('hides the header row read-only but keeps it, muted, in the studio', () => {
    const { unmount } = renderDefault({ header: false });
    expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
    unmount();
    renderStudio({ header: false });
    const header = screen.getByRole('textbox', { name: 'Column 1 header' });
    expect(header.closest('[title="Header row hidden"]')).toHaveClass('opacity-50');
  });

  it('aligns a column from its menu, writing align with the content', async () => {
    const user = userEvent.setup();
    const { update } = renderStudio();
    await user.click(screen.getByRole('button', { name: 'Column options for Amount' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Right' }));
    expect(update).toHaveBeenLastCalledWith('tb', {
      options: {
        headers: ['Fee', 'Amount'],
        rows: [
          ['Application', '$25'],
          ['Renewal', '$10'],
        ],
        align: ['left', 'right'],
      },
    });
  });

  it('gates the column alignment as the Content setting', () => {
    const content = { schema: SCHEMA, variants: { default: page() } } as DocumentContent;
    const patch = { options: { align: ['right'] } };
    expect(
      governanceOf(content, { elements: { tb: { edit: ['content'] } } })!.canPatch('tb', patch),
    ).toBe(true);
    expect(
      governanceOf(content, { elements: { tb: { edit: ['caption'] } } })!.canPatch('tb', patch),
    ).toBe(false);
  });

  it('writes inspector options only away from their defaults', () => {
    const content = { schema: SCHEMA, variants: { default: page() } } as DocumentContent;
    const target = inspectorTarget(content, { pageSelectedId: 'tb', focusedId: 'F', formId: 'F' })!;
    const data = inspectorForm(target).data;
    expect(data).toMatchObject({
      header: true,
      rowHeaders: false,
      striped: false,
      bordered: false,
      compact: false,
    });
    const next = applyInspector(content, target, {
      ...data,
      caption: 'Fees',
      header: false,
      rowHeaders: true,
      striped: true,
      bordered: true,
      compact: true,
    });
    const options = (next.variants['default'] as { elements: { options: object }[] }).elements[0]!
      .options;
    expect(options).toMatchObject({
      caption: 'Fees',
      header: false,
      rowHeaders: true,
      striped: true,
      bordered: true,
      compact: true,
    });
    const nextTarget = inspectorTarget(next, {
      pageSelectedId: 'tb',
      focusedId: 'F',
      formId: 'F',
    })!;
    const back = applyInspector(next, nextTarget, { ...data });
    const restored = (back.variants['default'] as { elements: { options: object }[] }).elements[0]!
      .options;
    for (const key of ['caption', 'header', 'rowHeaders', 'striped', 'bordered', 'compact'])
      expect(restored).not.toHaveProperty(key);
    expect(applyInspector(content, target, data)).toBe(content);
  });
});
