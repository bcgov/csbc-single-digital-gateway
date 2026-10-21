import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import * as studio from '../src/renderers/studio/index';
import { StudioEditorProvider, type ColumnEdit } from '../src/renderers/studio/index';
import { StudioVariantContext } from '../src/studio/variants/variant-context';

const SCHEMA = {
  type: 'object',
  properties: {
    people: {
      type: 'array',
      title: 'People',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name' },
          age: { type: 'integer', title: 'Age' },
        },
      },
    },
  },
};
const PAGE = {
  id: 'F',
  type: 'Form',
  label: 'Page',
  elements: [{ id: 't', type: 'Control', scope: '#/properties/people' }],
};

function renderTable({ variant = 'default' } = {}) {
  const editColumns = vi.fn<(id: string, edit: ColumnEdit) => void>();
  render(
    <StudioVariantContext.Provider value={{ name: variant, isDefault: variant === 'default' }}>
      <StudioEditorProvider update={vi.fn()} insert={vi.fn()} editColumns={editColumns}>
        <JsonForms
          schema={SCHEMA}
          uischema={PAGE as never}
          data={{}}
          renderers={studio.renderers}
          cells={studio.cells}
          validationMode="NoValidation"
        />
      </StudioEditorProvider>
    </StudioVariantContext.Provider>,
  );
  return { editColumns };
}

async function openKeyDialog(user: ReturnType<typeof userEvent.setup>, title = 'Name') {
  await user.click(screen.getByRole('button', { name: `Column options for ${title}` }));
  await user.click(await screen.findByRole('menuitem', { name: 'Change data key…' }));
  return screen.findByRole('dialog', { name: 'Change data key' });
}

describe('Change data key dialog (doc 264 rules 12-13)', () => {
  describe('dialog', () => {
    it('opens from the column menu with the current key', async () => {
      const user = userEvent.setup();
      renderTable();
      const dialog = await openKeyDialog(user);
      expect(dialog).toHaveTextContent("The key Name's answers are stored under.");
      expect(screen.getByRole('textbox', { name: 'Data key' })).toHaveValue('name');
    });

    it('shows the live problem and disables Save while invalid or unchanged', async () => {
      const user = userEvent.setup();
      renderTable();
      await openKeyDialog(user);
      const input = screen.getByRole('textbox', { name: 'Data key' });
      const save = screen.getByRole('button', { name: 'Save' });
      expect(save).toBeDisabled();
      await user.clear(input);
      await user.type(input, 'age');
      expect(screen.getByText('age is already used.')).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(save).toBeDisabled();
      await user.clear(input);
      await user.type(input, 'full name');
      expect(screen.getByText('Use letters, numbers, _ or -.')).toBeInTheDocument();
      await user.clear(input);
      await user.type(input, 'fullName');
      expect(screen.queryByText(/already used|Use letters/)).not.toBeInTheDocument();
      expect(save).toBeEnabled();
    });

    it('sends rekey on Save and nothing on Cancel', async () => {
      const user = userEvent.setup();
      const { editColumns } = renderTable();
      await openKeyDialog(user);
      await user.clear(screen.getByRole('textbox', { name: 'Data key' }));
      await user.type(screen.getByRole('textbox', { name: 'Data key' }), 'fullName');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      expect(editColumns).toHaveBeenCalledExactlyOnceWith('t', {
        kind: 'rekey',
        key: 'name',
        to: 'fullName',
      });
      expect(screen.queryByRole('dialog', { name: 'Change data key' })).not.toBeInTheDocument();
      await openKeyDialog(user, 'Age');
      await user.type(screen.getByRole('textbox', { name: 'Data key' }), '2');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog', { name: 'Change data key' })).not.toBeInTheDocument();
      expect(editColumns).toHaveBeenCalledTimes(1);
    });
  });

  describe('gating', () => {
    it('offers no Change data key when the table is not editable', () => {
      renderTable({ variant: 'short' });
      expect(screen.queryByRole('button', { name: /Column options/ })).not.toBeInTheDocument();
      expect(screen.queryByText('Change data key…')).not.toBeInTheDocument();
    });
  });
});
