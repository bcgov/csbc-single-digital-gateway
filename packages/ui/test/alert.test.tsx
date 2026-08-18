import { render, screen } from '@testing-library/react';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@ui/components/ui/alert';

describe('Alert', () => {
  it('renders with the note role by default and its content', () => {
    render(
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Something happened.</AlertDescription>
      </Alert>,
    );
    const alert = screen.getByRole('note');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('Something happened.')).toBeInTheDocument();
  });

  it('accepts a role override, e.g. for alerts that need immediate attention', () => {
    render(<Alert role="alert">Urgent</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('applies the info variant classes by default', () => {
    render(<Alert>Default</Alert>);
    const alert = screen.getByRole('note');
    expect(alert).toHaveClass('bg-info-surface');
    expect(alert.className).toContain('border-info-border');
  });

  it('applies the danger variant classes', () => {
    render(<Alert variant="danger">Bad</Alert>);
    const alert = screen.getByRole('note');
    expect(alert.className).toContain('bg-danger-surface');
    expect(alert.className).toContain('border-danger-border');
  });

  it('exposes data-slot attributes for each part', () => {
    render(
      <Alert>
        <AlertTitle>Title</AlertTitle>
        <AlertDescription>Body</AlertDescription>
        <AlertAction>
          <button type="button">Undo</button>
        </AlertAction>
      </Alert>,
    );
    expect(screen.getByRole('note')).toHaveAttribute('data-slot', 'alert');
    expect(screen.getByText('Title')).toHaveAttribute('data-slot', 'alert-title');
    expect(screen.getByText('Body')).toHaveAttribute('data-slot', 'alert-description');
    expect(screen.getByRole('button', { name: 'Undo' }).parentElement).toHaveAttribute(
      'data-slot',
      'alert-action',
    );
  });

  it('merges a custom className onto the root', () => {
    render(<Alert className="custom-alert">Hi</Alert>);
    expect(screen.getByRole('note')).toHaveClass('custom-alert');
  });
});
