import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FieldPreview, previewNodeForType } from '@/components/form-builder/field-card';
import type { FieldNode } from '@/components/form-builder/model';

vi.mock('@repo/react/jsonforms', () => ({
  JsonForms: ({ schema, uischema, readonly }: any) => (
    <div data-testid="mock-jsonforms" data-readonly={readonly}>
      Mock JsonForms rendering
      <span data-testid="schema-val">{JSON.stringify(schema)}</span>
      <span data-testid="uischema-val">{JSON.stringify(uischema)}</span>
    </div>
  ),
}));

vi.mock('@/components/form-builder/display-card', () => ({
  DisplayCard: ({ node }: any) => (
    <div data-testid="mock-display-card">Mock DisplayCard: {node.text}</div>
  ),
}));

describe('Field Card Component Test Suite', () => {
  describe('FieldPreview', () => {
    it('renders DisplayCard for display-kind nodes without ghost styles', () => {
      const node: FieldNode = {
        kind: 'display',
        id: 'd1',
        displayType: 'heading',
        text: 'Form Heading text',
      };

      const { container } = render(<FieldPreview node={node} ghost={false} />);

      expect(screen.getByTestId('mock-display-card')).toBeInTheDocument();
      expect(screen.getByText('Mock DisplayCard: Form Heading text')).toBeInTheDocument();

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('pointer-events-none');
      expect(wrapper).not.toHaveClass('border-dashed');
    });

    it('renders JsonForms for control nodes with ghost styling if ghost=true', () => {
      const node: FieldNode = {
        kind: 'control',
        fieldType: 'text',
        key: 'email_address',
        label: 'Email',
        options: {},
        required: false,
      };

      const { container } = render(<FieldPreview node={node} ghost={true} />);

      expect(screen.getByTestId('mock-jsonforms')).toBeInTheDocument();
      expect(screen.getByTestId('mock-jsonforms')).toHaveAttribute('data-readonly', 'true');

      // Verify the serialized definitions were passed down
      const schemaText = screen.getByTestId('schema-val').textContent || '';
      const uischemaText = screen.getByTestId('uischema-val').textContent || '';
      expect(schemaText).toContain('email_address');
      expect(uischemaText).toContain('Control');

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('pointer-events-none', 'border-dashed', 'border-primary');
    });

    it('defaults to non-ghost styling when ghost prop is omitted', () => {
      const node: FieldNode = {
        kind: 'display',
        id: 'd1',
        displayType: 'heading',
        text: 'Heading text content',
      };

      const { container } = render(<FieldPreview node={node} />);

      expect(screen.getByTestId('mock-display-card')).toBeInTheDocument();
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).not.toHaveClass('border-dashed');
    });
  });

  describe('previewNodeForType', () => {
    it('generates control node with correct key and label matching fieldType definition', () => {
      const node = previewNodeForType('text');
      expect(node.kind).toBe('control');
      if (node.kind === 'control') {
        expect(node.key).toBe('text');
        expect(node.label).toBe('Text');
      }
    });

    it('generates container node with label matching fieldType definition', () => {
      const node = previewNodeForType('group');
      expect(node.kind).toBe('container');
      if (node.kind === 'container') {
        expect(node.label).toBe('Group');
      }
    });

    it('generates display nodes keeping default content', () => {
      const node = previewNodeForType('heading');
      expect(node.kind).toBe('display');
      if (node.kind === 'display') {
        expect(node.displayType).toBe('heading');
        expect(node.text).toBe('Heading');
      }
    });

    it('falls back to fieldType as label when definition is not found', () => {
      const node = previewNodeForType('custom-unrecognized' as any);
      expect(node.kind).toBe('control');
      if (node.kind === 'control') {
        expect(node.label).toBe('custom-unrecognized');
        expect(node.key).toBe('custom-unrecognized');
      }
    });
  });
});
