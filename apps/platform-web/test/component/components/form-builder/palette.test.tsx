import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Palette } from '@/components/form-builder/palette';
import { useDraggable } from '@dnd-kit/react';

// Mock dnd-kit useDraggable
vi.mock('@dnd-kit/react', () => ({
  useDraggable: vi.fn(() => ({
    ref: () => {},
    isDragging: false,
  })),
}));

describe('Palette Component Test Suite', () => {
  afterEach(() => {
    vi.mocked(useDraggable).mockReturnValue({
      ref: () => {},
      isDragging: false,
    } as any);
  });
  it('Should render all component groups and fields by default', () => {
    render(<Palette onAdd={vi.fn()} />);

    // Renders group headers
    expect(screen.getByText('Core')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('Layout')).toBeInTheDocument();

    // Renders specific fields
    expect(screen.getByRole('button', { name: 'Text' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Number' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Boolean' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
  });

  it('Should trigger onAdd callback when clicking a component button', async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn();
    render(<Palette onAdd={handleAdd} />);

    const textBtn = screen.getByRole('button', { name: 'Text' });
    await user.click(textBtn);

    expect(handleAdd).toHaveBeenCalledWith('text');
  });

  it('Should filter components based on search query', async () => {
    const user = userEvent.setup();
    render(<Palette onAdd={vi.fn()} />);

    const searchInput = screen.getByLabelText('Search components');

    // Type "text"
    await user.type(searchInput, 'text');

    // "Text" should match and be visible (Multiline folded into Text — feature 158)
    expect(screen.getByRole('button', { name: 'Text' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Multiline' })).not.toBeInTheDocument();

    // "Number" and "Boolean" should NOT be visible
    expect(screen.queryByRole('button', { name: 'Number' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Boolean' })).not.toBeInTheDocument();
  });

  it('Should match components by their keywords', async () => {
    const user = userEvent.setup();
    render(<Palette onAdd={vi.fn()} />);

    const searchInput = screen.getByLabelText('Search components');

    // Type "dropdown" (keyword of Select)
    await user.type(searchInput, 'dropdown');

    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Text' })).not.toBeInTheDocument();
  });

  it('Should show empty state when no components match query', async () => {
    const user = userEvent.setup();
    render(<Palette onAdd={vi.fn()} />);

    const searchInput = screen.getByLabelText('Search components');

    await user.type(searchInput, 'xyzabc123');

    expect(screen.getByText('No components match.')).toBeInTheDocument();
    expect(screen.queryByText('Core')).not.toBeInTheDocument();
  });

  it('Should reset query when onClear is triggered on search input', async () => {
    const user = userEvent.setup();
    render(<Palette onAdd={vi.fn()} />);

    const searchInput = screen.getByLabelText('Search components');
    await user.type(searchInput, 'text');

    expect(screen.queryByRole('button', { name: 'Number' })).not.toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    await user.click(clearBtn);

    expect(screen.getByRole('button', { name: 'Number' })).toBeInTheDocument();
  });

  it('Should render palette item with dragging state when isDragging is true', () => {
    vi.mocked(useDraggable).mockReturnValue({
      ref: () => {},
      isDragging: true,
    } as any);

    render(<Palette onAdd={vi.fn()} />);

    const textBtn = screen.getByRole('button', { name: 'Text' });
    expect(textBtn).toHaveAttribute('data-dragging', 'true');
  });
});
