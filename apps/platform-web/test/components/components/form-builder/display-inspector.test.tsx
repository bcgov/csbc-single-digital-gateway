import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DisplayInspector } from '@/components/form-builder/display-inspector';
import type { DisplayNode } from '@/components/form-builder/model';

describe('DisplayInspector Component Test Suite', () => {
  it('renders heading config buttons and responds to edits', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const node: DisplayNode = {
      kind: 'display',
      id: 'h-1',
      displayType: 'heading',
      text: '',
      level: 2,
    };

    render(<DisplayInspector node={node} onChange={handleChange} />);

    // Verify Level buttons exist
    const headingBtn = screen.getByRole('button', { name: 'Heading' });
    const subheadingBtn = screen.getByRole('button', { name: 'Subheading' });
    expect(headingBtn).toBeInTheDocument();
    expect(subheadingBtn).toBeInTheDocument();

    // H2 level 2 is default active
    expect(headingBtn).toHaveAttribute('aria-pressed', 'true');
    expect(subheadingBtn).toHaveAttribute('aria-pressed', 'false');

    // Click subheading (level 3)
    await user.click(subheadingBtn);
    expect(handleChange).toHaveBeenCalledWith({ level: 3 });

    // Verify correct description content text
    expect(screen.getByText('Edit the heading content on the canvas.')).toBeInTheDocument();
  });

  it('renders paragraph alignment buttons and responds to alignment changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const node: DisplayNode = {
      kind: 'display',
      id: 'p-1',
      displayType: 'paragraph',
      text: '',
      align: 'left',
    };

    render(<DisplayInspector node={node} onChange={handleChange} />);

    // Verify Alignment buttons
    const leftBtn = screen.getByRole('button', { name: 'Align left' });
    const centerBtn = screen.getByRole('button', { name: 'Align center' });
    const rightBtn = screen.getByRole('button', { name: 'Align right' });

    expect(leftBtn).toBeInTheDocument();
    expect(centerBtn).toBeInTheDocument();
    expect(rightBtn).toBeInTheDocument();

    // Default align: left is active
    expect(leftBtn).toHaveAttribute('aria-pressed', 'true');
    expect(centerBtn).toHaveAttribute('aria-pressed', 'false');

    // Click center align
    await user.click(centerBtn);
    expect(handleChange).toHaveBeenCalledWith({ align: 'center' });

    // Verify description
    expect(screen.getByText('Edit the paragraph content on the canvas.')).toBeInTheDocument();
  });

  it('renders only rich text help tip when displayType is richtext', () => {
    const node: DisplayNode = {
      kind: 'display',
      id: 'r-1',
      displayType: 'richtext',
      text: '',
    };

    render(<DisplayInspector node={node} onChange={vi.fn()} />);

    // Rich text does not have configurations in inspector
    expect(screen.queryByText('Level')).not.toBeInTheDocument();
    expect(screen.queryByText('Alignment')).not.toBeInTheDocument();

    // Verify text matches expected Rich Text display name format
    expect(screen.getByText('Edit the rich text content on the canvas.')).toBeInTheDocument();
  });

  it('defaults to level 2 heading active when level is undefined', () => {
    const node: DisplayNode = {
      kind: 'display',
      id: 'h-2',
      displayType: 'heading',
      text: '',
    };

    render(<DisplayInspector node={node} onChange={vi.fn()} />);

    const headingBtn = screen.getByRole('button', { name: 'Heading' });
    expect(headingBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('defaults to left alignment active when align is undefined', () => {
    const node: DisplayNode = {
      kind: 'display',
      id: 'p-2',
      displayType: 'paragraph',
      text: '',
    };

    render(<DisplayInspector node={node} onChange={vi.fn()} />);

    const leftBtn = screen.getByRole('button', { name: 'Align left' });
    expect(leftBtn).toHaveAttribute('aria-pressed', 'true');
  });
});
