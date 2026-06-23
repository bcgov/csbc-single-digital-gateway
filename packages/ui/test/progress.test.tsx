import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Progress, ProgressLabel, ProgressValue } from '@ui/components/ui/progress';

describe('Progress', () => {
  it('exposes a progressbar role with the provided value', () => {
    render(<Progress value={40} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute('aria-valuenow', '40');
  });

  it('defaults the value bounds to 0 and 100', () => {
    render(<Progress value={40} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
  });

  it('renders an accessible label and a textual value', () => {
    render(
      <Progress value={75}>
        <ProgressLabel>Upload</ProgressLabel>
        <ProgressValue />
      </Progress>,
    );

    expect(screen.getByText('Upload')).toBeInTheDocument();
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAccessibleName('Upload');
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('reflects an updated value on rerender', () => {
    const { rerender } = render(<Progress value={10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10');

    rerender(<Progress value={90} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '90');
  });
});
