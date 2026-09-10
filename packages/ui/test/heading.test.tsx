import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Heading } from '@ui/typography/heading';
import type { HeadingLevel } from '@ui/typography/heading';

const LEVELS: HeadingLevel[] = [1, 2, 3, 4, 5, 6];

describe('Heading', () => {
  describe('level → semantic element', () => {
    it('renders an h1 by default', () => {
      render(<Heading>Page title</Heading>);
      const heading = screen.getByRole('heading', { name: 'Page title' });
      expect(heading.tagName).toBe('H1');
      expect(heading).toHaveAccessibleName('Page title');
    });

    it('renders the matching element for each level 1-6', () => {
      for (const level of LEVELS) {
        const { unmount } = render(<Heading level={level}>Level {level}</Heading>);
        const heading = screen.getByRole('heading', { level });
        expect(heading.tagName, `level=${level}`).toBe(`H${level}`);
        unmount();
      }
    });
  });

  describe('size → visual scale', () => {
    it('emits no size class when size is omitted', () => {
      // The bare element is styled by the base layer (src/styles/base.css), so the component
      // deliberately adds nothing rather than duplicating the element default as a class.
      render(<Heading level={2}>Bare</Heading>);
      expect(screen.getByRole('heading', { level: 2 })).not.toHaveAttribute('class');
    });

    it('applies text-hN font-bold for sizes 1-5', () => {
      for (const size of [1, 2, 3, 4, 5] as HeadingLevel[]) {
        const { unmount } = render(<Heading size={size}>Sized {size}</Heading>);
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading, `size=${size}`).toHaveClass(`text-h${size}`, 'font-bold');
        unmount();
      }
    });

    it('applies text-lg font-bold for size 6', () => {
      // text-lg and text-h6 both resolve to --bcds-typography-font-size-large-body.
      render(<Heading size={6}>Smallest</Heading>);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('text-lg', 'font-bold');
      expect(heading).not.toHaveClass('text-h6');
    });
  });

  describe('level and size are independent', () => {
    it('renders an h1 at size 2 when only size is given', () => {
      render(<Heading size={2}>Demoted look</Heading>);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.tagName).toBe('H1');
      expect(heading).toHaveClass('text-h2', 'font-bold');
      expect(heading).not.toHaveClass('text-h1');
    });

    it('renders an h3 at size 1 when both are given', () => {
      render(
        <Heading level={3} size={1}>
          Promoted look
        </Heading>,
      );
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.tagName).toBe('H3');
      expect(heading).toHaveClass('text-h1', 'font-bold');
    });
  });

  describe('className merging', () => {
    it('merges a custom className alongside the size classes', () => {
      render(
        <Heading size={2} className="tracking-tight">
          Merged
        </Heading>,
      );
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('text-h2', 'font-bold', 'tracking-tight');
    });

    it('lets a conflicting caller class win over the size map', () => {
      // Stock tailwind-merge files text-h1 under text-*color*, so neither of these would work
      // with the shared cn() — see the local extendTailwindMerge in heading.tsx.
      render(
        <Heading size={1} className="text-sm font-normal">
          Overridden
        </Heading>,
      );
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('text-sm', 'font-normal');
      expect(heading).not.toHaveClass('text-h1', 'font-bold');
    });

    it('keeps the size class when the caller adds an unrelated text-colour class', () => {
      render(
        <Heading size={1} className="text-danger">
          Coloured
        </Heading>,
      );
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('text-h1', 'font-bold', 'text-danger');
    });

    it('does not emit an empty class attribute when size and className are both omitted', () => {
      render(<Heading>Nothing</Heading>);
      expect(screen.getByRole('heading', { level: 1 })).not.toHaveAttribute('class');
    });
  });

  describe('prop pass-through', () => {
    it('forwards id, aria-* and data-* attributes to the heading element', () => {
      render(
        <Heading level={2} id="section-title" aria-describedby="blurb" data-testid="passthrough">
          Section
        </Heading>,
      );
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveAttribute('id', 'section-title');
      expect(heading).toHaveAttribute('aria-describedby', 'blurb');
      expect(heading).toHaveAttribute('data-testid', 'passthrough');
    });

    it('forwards a ref to the underlying heading element', () => {
      const ref = createRef<HTMLHeadingElement>();
      render(
        <Heading level={4} ref={ref}>
          Referenced
        </Heading>,
      );
      expect(ref.current).toBe(screen.getByRole('heading', { level: 4 }));
      expect(ref.current?.tagName).toBe('H4');
    });
  });

  describe('edge cases', () => {
    it('renders an empty heading when given no children', () => {
      render(<Heading level={5} data-testid="empty" />);
      const heading = screen.getByTestId('empty');
      expect(heading.tagName).toBe('H5');
      expect(heading).toBeEmptyDOMElement();
    });
  });
});

describe('@repo/ui heading entry', () => {
  it('exports Heading from the generated ./heading subpath', async () => {
    const entry = await import('@ui/heading');
    expect(entry.Heading).toBe(Heading);
  });
});
