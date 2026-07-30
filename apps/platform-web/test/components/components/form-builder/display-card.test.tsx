import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DisplayCard } from '@/components/form-builder/display-card';
import type { DisplayNode } from '@/components/form-builder/model';

vi.mock('@repo/ui/rich-text-input', () => ({
  RichTextInput: ({ id, value, onChange }: any) => (
    <textarea
      data-testid="mock-rich-text-input"
      id={id}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe('DisplayCard Component Test Suite', () => {
  it('renders heading input with correct styling and responds to edits', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const node: DisplayNode = {
      kind: 'display',
      id: 'd1',
      displayType: 'heading',
      text: 'Main Heading',
      level: 2,
    };

    const { rerender } = render(<DisplayCard node={node} path={[0]} onChange={handleChange} />);

    expect(screen.getByText('Heading')).toBeInTheDocument();
    const input = screen.getByLabelText('Heading');
    expect(input).toHaveValue('Main Heading');
    expect(input).toHaveClass('text-xl'); // Heading level 2 styling

    // Edit text
    await user.type(input, '!');
    expect(handleChange).toHaveBeenCalledWith([0], { text: 'Main Heading!' });

    // Test level 3 styling
    rerender(<DisplayCard node={{ ...node, level: 3 }} path={[0]} onChange={handleChange} />);
    expect(screen.getByLabelText('Heading')).toHaveClass('text-lg');
  });

  it('renders paragraph textarea with correct alignment and responds to edits', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const node: DisplayNode = {
      kind: 'display',
      id: 'd2',
      displayType: 'paragraph',
      text: 'Paragraph text content',
      align: 'center',
    };

    render(<DisplayCard node={node} path={[1]} onChange={handleChange} />);

    expect(screen.getByText('Paragraph')).toBeInTheDocument();
    const textarea = screen.getByLabelText('Paragraph');
    expect(textarea).toHaveValue('Paragraph text content');
    expect(textarea).toHaveClass('text-center'); // center alignment style

    // Edit text
    await user.type(textarea, '!');
    expect(handleChange).toHaveBeenCalledWith([1], { text: 'Paragraph text content!' });
  });

  it('renders RichTextInput for richtext display type and responds to edits', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const node: DisplayNode = {
      kind: 'display',
      id: 'd3',
      displayType: 'richtext',
      text: '',
      content: 'Rich content',
    };

    render(<DisplayCard node={node} path={[2]} onChange={handleChange} />);

    expect(screen.getByText('Content')).toBeInTheDocument();
    const editor = screen.getByTestId('mock-rich-text-input');
    expect(editor).toHaveValue('Rich content');

    // Edit content
    await user.type(editor, '!');
    expect(handleChange).toHaveBeenCalledWith([2], { content: 'Rich content!' });
  });

  it('defaults to level 2 heading styling when level is undefined', () => {
    const handleChange = vi.fn();
    const node: DisplayNode = {
      kind: 'display',
      id: 'd4',
      displayType: 'heading',
      text: 'Heading without level',
    };

    render(<DisplayCard node={node} path={[0]} onChange={handleChange} />);

    const input = screen.getByLabelText('Heading');
    expect(input).toHaveClass('text-xl');
  });

  it('defaults to left text alignment when align is undefined', () => {
    const handleChange = vi.fn();
    const node: DisplayNode = {
      kind: 'display',
      id: 'd5',
      displayType: 'paragraph',
      text: 'Paragraph text without alignment',
    };

    render(<DisplayCard node={node} path={[1]} onChange={handleChange} />);

    const textarea = screen.getByLabelText('Paragraph');
    expect(textarea).toHaveClass('text-left');
  });

  it('handles omitted content value in RichTextInput', () => {
    const handleChange = vi.fn();
    const node: DisplayNode = {
      kind: 'display',
      id: 'd6',
      displayType: 'richtext',
      text: '',
    };

    render(<DisplayCard node={node} path={[2]} onChange={handleChange} />);

    const editor = screen.getByTestId('mock-rich-text-input');
    expect(editor).toHaveValue('');
  });
});
