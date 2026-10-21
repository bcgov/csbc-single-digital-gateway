import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductWordmark } from '@/components/product-wordmark';

describe('ProductWordmark', () => {
  it('Should render default product wordmark with base classes when className is omitted', () => {
    const { container } = render(<ProductWordmark />);
    const rootSpan = container.firstElementChild;

    expect(screen.getByText('Operations Portal')).toBeInTheDocument();
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(rootSpan).toHaveClass(
      'inline-flex',
      'items-center',
      'gap-1',
      'whitespace-nowrap',
      'font-semibold',
    );
  });

  it('Should render product wordmark with custom className appended', () => {
    const { container } = render(<ProductWordmark className="text-2xl text-primary" />);
    const rootSpan = container.firstElementChild;

    expect(rootSpan).toHaveClass('inline-flex', 'text-2xl', 'text-primary');
  });
});
