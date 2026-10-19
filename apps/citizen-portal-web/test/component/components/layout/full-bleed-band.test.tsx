import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FullBleedBand } from '@/components/layout/full-bleed-band';
import { PAGE_COLUMN_CLASS } from '@/components/layout/page-content';

describe('FullBleedBand', () => {
  it('puts its styling on the full-width band and its children in the page column', () => {
    const { container } = render(
      <FullBleedBand className="bg-blue-10">
        <p>Hero copy</p>
      </FullBleedBand>,
    );
    const band = container.firstElementChild;
    expect(band).toHaveClass('bg-blue-10');
    const column = screen.getByText('Hero copy').parentElement;
    expect(column?.className).toBe(PAGE_COLUMN_CLASS);
    expect(band).toContainElement(column ?? null);
  });
});
