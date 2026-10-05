import { JsonForms } from '@jsonforms/react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as studio from '../src/renderers/studio/index';
import { StudioEditorProvider, type ElementPatch } from '../src/renderers/studio/index';
import { settingChoices } from '../src/studio/capabilities/capability-fields';
import type { CapabilityMap } from '../src/studio/capabilities/capability-types';
import { governanceOf } from '../src/studio/capabilities/governance';
import type { DocumentContent } from '../src/studio/document-types';
import { fieldsFor } from '../src/studio/inspector/inspector-form';
import { inspectorTarget } from '../src/studio/inspector/inspector-target';
import { DEFAULT_PALETTE_ITEMS } from '../src/studio/palette-items';
import { StudioVariantContext } from '../src/studio/variants/variant-context';

const OPTIONS = { headers: ['Fee', 'Amount'], rows: [['Application', '$25']] };
const PAGE = {
  id: 'F',
  type: 'Form',
  label: 'Page',
  elements: [{ id: 'tb', type: 'Table', options: OPTIONS }],
};
const CONTENT = { schema: { type: 'object', properties: {} }, variants: { default: PAGE } };
const governed = (map: CapabilityMap) => governanceOf(CONTENT as DocumentContent, map)!;

function renderTable({
  editable = true,
  map,
  variant = 'default',
}: { editable?: boolean; map?: CapabilityMap; variant?: string } = {}) {
  const update = vi.fn<(id: string, patch: ElementPatch) => void>();
  const form = (
    <JsonForms
      schema={CONTENT.schema}
      uischema={PAGE as never}
      data={{}}
      renderers={studio.renderers}
      cells={studio.cells}
      validationMode="NoValidation"
    />
  );
  const view = render(
    <StudioVariantContext.Provider value={{ name: variant, isDefault: variant === 'default' }}>
      {editable ? (
        <StudioEditorProvider
          update={update}
          insert={vi.fn()}
          {...(map !== undefined && { governance: governed(map) })}
        >
          {form}
        </StudioEditorProvider>
      ) : (
        form
      )}
    </StudioVariantContext.Provider>,
  );
  const lastOptions = () => update.mock.calls.at(-1)?.[1].options;
  return { ...view, update, lastOptions };
}

const expectReadOnly = () => {
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: /Add|Delete|Column options/ }),
  ).not.toBeInTheDocument();
  expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Fee', 'Amount']);
};

const input = (name: string) => screen.getByRole('textbox', { name }) as HTMLInputElement;

describe('Table — studio renderer (doc 265 rules 4-10)', () => {
  describe('editing', () => {
    it('renders header and cell inputs, column menus, Add column and Add row when editable', () => {
      renderTable();
      expect(input('Column 1 header').value).toBe('Fee');
      expect(input('Column 2 header').value).toBe('Amount');
      expect(input('Row 1, column 1').value).toBe('Application');
      expect(input('Row 1, column 2').value).toBe('$25');
      expect(screen.getByRole('button', { name: 'Column options for Fee' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add column' })).toHaveClass('nodrag');
      expect(screen.getByRole('button', { name: 'Add row' })).toHaveClass('pointer-events-auto');
      expect(screen.getByRole('button', { name: 'Delete row 1' })).toBeInTheDocument();
    });

    it('commits a header or cell on blur or Enter, including blank, and restores on Escape', () => {
      const { update, lastOptions } = renderTable();
      act(() => input('Column 1 header').focus());
      fireEvent.change(input('Column 1 header'), { target: { value: 'Fee type ' } });
      act(() => input('Column 1 header').blur());
      expect(update).toHaveBeenLastCalledWith('tb', {
        options: { headers: ['Fee type', 'Amount'], rows: OPTIONS.rows },
      });
      act(() => input('Row 1, column 2').focus());
      fireEvent.change(input('Row 1, column 2'), { target: { value: '' } });
      fireEvent.keyDown(input('Row 1, column 2'), { key: 'Enter' });
      expect(lastOptions()).toEqual({ headers: OPTIONS.headers, rows: [['Application', '']] });
      expect(update).toHaveBeenCalledTimes(2);
      act(() => input('Row 1, column 1').focus());
      fireEvent.change(input('Row 1, column 1'), { target: { value: 'Nope' } });
      fireEvent.keyDown(input('Row 1, column 1'), { key: 'Escape' });
      expect(input('Row 1, column 1').value).toBe('Application');
      expect(update).toHaveBeenCalledTimes(2);
    });

    it('adds and deletes rows and columns and moves columns through update', async () => {
      const user = userEvent.setup();
      const { lastOptions } = renderTable();
      await user.click(screen.getByRole('button', { name: 'Add row' }));
      expect(lastOptions()).toEqual({
        headers: OPTIONS.headers,
        rows: [...OPTIONS.rows, ['', '']],
      });
      await user.click(screen.getByRole('button', { name: 'Add column' }));
      expect(lastOptions()).toEqual({
        headers: ['Fee', 'Amount', 'Column 3'],
        rows: [['Application', '$25', '']],
      });
      await user.click(screen.getByRole('button', { name: 'Delete row 1' }));
      expect(lastOptions()).toEqual({ headers: OPTIONS.headers, rows: [] });
      await user.click(screen.getByRole('button', { name: 'Column options for Fee' }));
      expect(await screen.findByRole('menuitem', { name: 'Move left' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await user.click(screen.getByRole('menuitem', { name: 'Move right' }));
      expect(lastOptions()).toEqual({ headers: ['Amount', 'Fee'], rows: [['$25', 'Application']] });
      await user.click(screen.getByRole('button', { name: 'Column options for Amount' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Delete column' }));
      expect(lastOptions()).toEqual({ headers: ['Fee'], rows: [['Application']] });
    });
  });

  describe('read-only', () => {
    it('renders the read-only table without an editor or when the template locks content', () => {
      const { unmount } = renderTable({ editable: false });
      expectReadOnly();
      unmount();
      renderTable({ map: { elements: { tb: { edit: ['rule'] } } } });
      expectReadOnly();
    });

    it('stays editable outside the default variant', () => {
      renderTable({ variant: 'mobile' });
      expect(input('Column 1 header').value).toBe('Fee');
    });
  });

  describe('wiring', () => {
    it('maps headers and rows patches to the content setting in governance', () => {
      const patch = { options: { headers: ['x'], rows: [] } };
      expect(governed({ elements: { tb: { edit: ['content'] } } }).canPatch('tb', patch)).toBe(
        true,
      );
      expect(governed({ elements: { tb: { edit: ['rule'] } } }).canPatch('tb', patch)).toBe(false);
    });

    it('names the target Table and offers Content in template settings', () => {
      const target = inspectorTarget(CONTENT as DocumentContent, {
        pageSelectedId: 'tb',
        focusedId: 'F',
        formId: 'F',
      })!;
      expect(target.kind).toBe('table');
      expect(target.name).toBeUndefined();
      expect(fieldsFor(target)).toEqual([]);
      expect(settingChoices(target)).toContainEqual({ const: 'content', title: 'Content' });
    });

    it('creates a fresh Table palette item in Content', () => {
      const item = DEFAULT_PALETTE_ITEMS.find((candidate) => candidate.id === 'table')!;
      expect(item).toMatchObject({ label: 'Table', group: 'Content' });
      const [a, b] = [item.create(), item.create()];
      expect(a.properties).toBeUndefined();
      expect(a.element).toMatchObject({
        type: 'Table',
        options: { headers: ['Column 1', 'Column 2'], rows: [['', '']] },
      });
      expect(a.element['id']).not.toBe(b.element['id']);
      expect(a.element['options']).not.toBe(b.element['options']);
    });
  });
});
