import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FormBuilderDialog, EMPTY_FORM_DEFINITION } from '@/components/form-builder/builder-dialog';

vi.mock('@/components/form-builder/form-builder', () => ({
  FormBuilder: ({ value, onChange }: any) => (
    <div data-testid="mock-form-builder">
      Mock Form Builder
      <button
        onClick={() => onChange({ ...value, schema: { ...value.schema, title: 'Updated Schema' } })}
      >
        Trigger Change
      </button>
    </div>
  ),
}));

describe('FormBuilderDialog', () => {
  it('does not render content when open is false', () => {
    const handleOpenChange = vi.fn();
    const handleChange = vi.fn();

    render(
      <FormBuilderDialog
        open={false}
        onOpenChange={handleOpenChange}
        title="Custom Title"
        value={EMPTY_FORM_DEFINITION}
        onChange={handleChange}
      />,
    );

    expect(screen.queryByRole('heading', { name: 'Custom Title' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-form-builder')).not.toBeInTheDocument();
  });

  it('renders custom title and FormBuilder component when open is true', () => {
    render(
      <FormBuilderDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Edit Application Form"
        value={EMPTY_FORM_DEFINITION}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Edit Application Form' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-form-builder')).toBeInTheDocument();
  });

  it('falls back to Design form title when title is empty', () => {
    render(
      <FormBuilderDialog
        open={true}
        onOpenChange={vi.fn()}
        title=""
        value={EMPTY_FORM_DEFINITION}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Design form' })).toBeInTheDocument();
  });

  it('propagates value changes from FormBuilder through onChange handler', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <FormBuilderDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Form Designer"
        value={EMPTY_FORM_DEFINITION}
        onChange={handleChange}
      />,
    );

    const btn = screen.getByRole('button', { name: 'Trigger Change' });
    await user.click(btn);

    expect(handleChange).toHaveBeenCalledWith({
      schema: { type: 'object', properties: {}, required: [], title: 'Updated Schema' },
      uischema: { type: 'VerticalLayout', elements: [] },
    });
  });
});
