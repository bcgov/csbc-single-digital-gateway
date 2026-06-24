import { render, screen } from '@testing-library/react';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@ui/components/ui/alert';

describe('Alert', () => {
  it('renders with the alert role and its content', () => {
    render(
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Something happened.</AlertDescription>
      </Alert>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('Something happened.')).toBeInTheDocument();
  });

  it('applies the default variant classes', () => {
    render(<Alert>Default</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-card');
    expect(alert.className).toContain('text-card-foreground');
  });

  it('applies the destructive variant classes', () => {
    render(<Alert variant="destructive">Bad</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('text-destructive');
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
    expect(screen.getByRole('alert')).toHaveAttribute('data-slot', 'alert');
    expect(screen.getByText('Title')).toHaveAttribute('data-slot', 'alert-title');
    expect(screen.getByText('Body')).toHaveAttribute('data-slot', 'alert-description');
    expect(screen.getByRole('button', { name: 'Undo' }).parentElement).toHaveAttribute(
      'data-slot',
      'alert-action',
    );
  });

  it('merges a custom className onto the root', () => {
    render(<Alert className="custom-alert">Hi</Alert>);
    expect(screen.getByRole('alert')).toHaveClass('custom-alert');
  });
});
