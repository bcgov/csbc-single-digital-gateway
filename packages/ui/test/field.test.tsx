import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
  FieldContent,
  FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

describe('Field', () => {
  it('renders as a role=group with default vertical orientation', () => {
    render(
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input id="email" />
      </Field>,
    );
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('data-slot', 'field');
    expect(group).toHaveAttribute('data-orientation', 'vertical');
  });

  it('associates a FieldLabel with its control via htmlFor/id', async () => {
    const user = userEvent.setup();
    render(
      <Field>
        <FieldLabel htmlFor="name">Full name</FieldLabel>
        <Input id="name" />
      </Field>,
    );
    const input = screen.getByLabelText('Full name');
    await user.type(input, 'Ada');
    expect(input).toHaveValue('Ada');
  });

  it('reflects the horizontal orientation via data-orientation', () => {
    render(
      <Field orientation="horizontal" data-testid="field">
        <FieldLabel htmlFor="x">X</FieldLabel>
      </Field>,
    );
    expect(screen.getByTestId('field')).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('renders FieldError with role=alert from a children message', () => {
    render(<FieldError>Something went wrong</FieldError>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('data-slot', 'field-error');
    expect(alert).toHaveTextContent('Something went wrong');
  });

  it('renders FieldError from an errors array, de-duplicating messages', () => {
    render(<FieldError errors={[{ message: 'Required' }, { message: 'Required' }]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('renders nothing for FieldError with no content', () => {
    const { container } = render(<FieldError />);
    expect(container.querySelector('[data-slot="field-error"]')).toBeNull();
  });

  it('composes a FieldSet with legend, description and content', () => {
    render(
      <FieldSet data-testid="set">
        <FieldLegend>Account</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldContent>
              <FieldTitle>Username</FieldTitle>
              <FieldDescription>Pick a unique handle.</FieldDescription>
            </FieldContent>
          </Field>
        </FieldGroup>
      </FieldSet>,
    );
    const set = screen.getByTestId('set');
    expect(set.tagName).toBe('FIELDSET');
    expect(within(set).getByText('Account')).toHaveAttribute('data-slot', 'field-legend');
    expect(within(set).getByText('Pick a unique handle.')).toHaveAttribute(
      'data-slot',
      'field-description',
    );
  });
});
