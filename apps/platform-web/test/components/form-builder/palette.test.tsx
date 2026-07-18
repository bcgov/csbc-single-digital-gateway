import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Palette } from '@/components/form-builder/palette';

// Mock dnd-kit useDraggable
vi.mock('@dnd-kit/react', () => ({
  useDraggable: vi.fn(() => ({
    ref: () => {},
    isDragging: false,
  })),
}));

describe('Palette', () => {
  it('renders all component groups and fields by default', () => {
    render(<Palette onAdd={vi.fn()} />);

    // Renders group headers
    expect(screen.getByText('Core')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('Layout')).toBeInTheDocument();

    // Renders specific fields
    expect(screen.getByRole('button', { name: 'Text' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Number' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Checkbox' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
  });

  it('triggers onAdd callback when clicking a component button', async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn();
    render(<Palette onAdd={handleAdd} />);

    const textBtn = screen.getByRole('button', { name: 'Text' });
    await user.click(textBtn);

    expect(handleAdd).toHaveBeenCalledWith('text');
  });

  it('filters components based on search query', async () => {
    const user = userEvent.setup();
    render(<Palette onAdd={vi.fn()} />);

    const searchInput = screen.getByLabelText('Search components');

    // Type "text"
    await user.type(searchInput, 'text');

    // "Text" and "Multiline" should match and be visible
    expect(screen.getByRole('button', { name: 'Text' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Multiline' })).toBeInTheDocument();

    // "Number" and "Checkbox" should NOT be visible
    expect(screen.queryByRole('button', { name: 'Number' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Checkbox' })).not.toBeInTheDocument();
  });

  it('matches components by their keywords', async () => {
    const user = userEvent.setup();
    render(<Palette onAdd={vi.fn()} />);

    const searchInput = screen.getByLabelText('Search components');

    // Type "dropdown" (keyword of Select)
    await user.type(searchInput, 'dropdown');

    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Text' })).not.toBeInTheDocument();
  });

  it('shows empty state when no components match query', async () => {
    const user = userEvent.setup();
    render(<Palette onAdd={vi.fn()} />);

    const searchInput = screen.getByLabelText('Search components');

    await user.type(searchInput, 'xyzabc123');

    expect(screen.getByText('No components match.')).toBeInTheDocument();
    expect(screen.queryByText('Core')).not.toBeInTheDocument();
  });
});
