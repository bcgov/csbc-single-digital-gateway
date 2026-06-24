import { render, screen } from '@testing-library/react';
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@ui/components/ui/avatar';

describe('Avatar', () => {
  it('renders a fallback when no image has loaded', () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('applies the default size data-attribute', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    const root = container.querySelector('[data-slot="avatar"]');
    expect(root).toHaveAttribute('data-size', 'default');
  });

  it('reflects the size prop via the data-size attribute', () => {
    const { container } = render(
      <Avatar size="lg">
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    const root = container.querySelector('[data-slot="avatar"]');
    expect(root).toHaveAttribute('data-size', 'lg');
  });

  it('renders an avatar badge inside the avatar', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
        <AvatarBadge data-testid="badge" />
      </Avatar>,
    );
    const badge = container.querySelector('[data-slot="avatar-badge"]');
    expect(badge).not.toBeNull();
  });

  it('renders a group with a count summary', () => {
    render(
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+3</AvatarGroupCount>
      </AvatarGroup>,
    );
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('+3')).toHaveAttribute('data-slot', 'avatar-group-count');
  });

  it('accepts an image part with the expected slot', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="https://example.com/a.png" alt="Profile" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    expect(container.querySelector('[data-slot="avatar"]')).not.toBeNull();
    expect(screen.getByText('AB')).toBeInTheDocument();
  });
});
