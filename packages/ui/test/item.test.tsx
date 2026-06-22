import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@/components/ui/item';

describe('Item', () => {
  it('renders a div with the item slot and its children', () => {
    const { container } = render(<Item>Hello item</Item>);
    const root = container.querySelector('[data-slot="item"]');
    expect(root).not.toBeNull();
    expect(root?.tagName).toBe('DIV');
    expect(root).toHaveTextContent('Hello item');
  });

  it('applies the outline variant border class', () => {
    const { container } = render(<Item variant="outline">Bordered</Item>);
    const root = container.querySelector('[data-slot="item"]');
    expect(root?.className).toContain('border-border');
  });

  it('applies size-specific padding for the xs size', () => {
    const { container } = render(<Item size="xs">Compact</Item>);
    const root = container.querySelector('[data-slot="item"]');
    expect(root?.className).toContain('px-2.5');
  });

  it('renders as a custom element via the render prop', () => {
    render(<Item render={<a href="https://example.com" />}>Linked item</Item>);
    const link = screen.getByRole('link', { name: 'Linked item' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('data-slot', 'item');
  });

  it('exposes structural sub-slots with correct roles and data attributes', () => {
    const { container } = render(
      <ItemGroup>
        <Item>
          <ItemMedia variant="icon">M</ItemMedia>
          <ItemContent>
            <ItemTitle>Title</ItemTitle>
            <ItemDescription>Description</ItemDescription>
          </ItemContent>
          <ItemActions>A</ItemActions>
        </Item>
        <ItemSeparator />
      </ItemGroup>,
    );

    const group = screen.getByRole('list');
    expect(group).toHaveAttribute('data-slot', 'item-group');
    expect(within(group).getByText('Title')).toHaveAttribute('data-slot', 'item-title');
    expect(within(group).getByText('Description').tagName).toBe('P');
    expect(container.querySelector('[data-slot="item-media"]')).toHaveAttribute(
      'data-variant',
      'icon',
    );
    expect(container.querySelector('[data-slot="item-separator"]')).not.toBeNull();
  });
});
