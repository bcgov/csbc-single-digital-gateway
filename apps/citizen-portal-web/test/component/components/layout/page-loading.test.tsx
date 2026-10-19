import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageLoading } from '@/components/layout/page-loading';

describe('PageLoading', () => {
  it('marks itself busy and renders the variant skeleton shape', () => {
    const { container } = render(<PageLoading variant="detail" />);
    const region = container.firstElementChild;
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region?.children).toHaveLength(3);
  });

  it('defaults to the content shape', () => {
    const { container } = render(<PageLoading />);
    expect(container.firstElementChild?.children).toHaveLength(2);
  });
});
