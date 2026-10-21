import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { findById } from '../src/studio/element-ids';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { fieldsFor, inspectorForm } from '../src/studio/inspector/inspector-form';
import { InspectorSettings } from '../src/studio/inspector/inspector-settings';
import { inspectorTarget } from '../src/studio/inspector/inspector-target';
import { form } from './funnel-fixtures';

const SCHEMA = { type: 'object', properties: { name: { type: 'string', title: 'Name' } } };
const card = (footer: unknown[] | null = []): Uischema => ({
  id: 'C',
  type: 'Card',
  label: 'Contact',
  elements: [
    { id: 'c', type: 'VerticalLayout', elements: [] },
    ...(footer === null ? [] : [{ id: 'f', type: 'VerticalLayout', elements: footer }]),
  ],
});
const contentWith = (element: Uischema): DocumentContent => ({
  schema: SCHEMA,
  variants: { default: form('F', 'Page', [element]) },
});
const targetOf = (content: DocumentContent, id: string) =>
  inspectorTarget(content, { pageSelectedId: id, focusedId: 'F', formId: 'F' })!;
const cardIn = (content: DocumentContent) => findById(content.variants.default, 'C')!;
const apply = (content: DocumentContent, values: Record<string, unknown>) => {
  const target = targetOf(content, 'C');
  return applyInspector(content, target, { ...inspectorForm(target).data, ...values });
};

describe('Card in the inspector (doc 273 rules 8-9)', () => {
  it('inspects a Card as kind card with Title, Description, Size, Spacing and Show footer', () => {
    const content = contentWith(card());
    const target = targetOf(content, 'C');
    expect(target.kind).toBe('card');
    expect(fieldsFor(target).map((f) => f.key)).toEqual(
      expect.arrayContaining([
        'cardTitle',
        'cardDescription',
        'cardSize',
        'cardSpacing',
        'cardFooter',
      ]),
    );
    expect(inspectorForm(target).data).toMatchObject({
      cardTitle: 'Contact',
      cardSize: 'default',
      cardFooter: true,
    });
    expect(inspectorForm(target).data['cardSpacing']).toBeUndefined();
    expect(fieldsFor(target).map((f) => f.key)).not.toContain('gap');
    // A slot is an ordinary VerticalLayout: its own Spacing, none of the Card's fields.
    expect(fieldsFor(targetOf(content, 'c')).map((f) => f.key)).not.toContain('cardTitle');
  });

  it('writes title, description, size and spacing; defaults and blanks are absent keys', () => {
    const content = contentWith(card());
    const next = apply(content, {
      cardTitle: 'Reach us',
      cardDescription: 'Any time',
      cardSize: 'sm',
      cardSpacing: 'lg',
    });
    expect(cardIn(next)).toMatchObject({
      label: 'Reach us',
      options: { description: 'Any time', size: 'sm', gap: 'lg' },
    });
    const back = apply(next, {
      cardTitle: '',
      cardDescription: '',
      cardSize: 'default',
      cardSpacing: undefined,
    });
    expect(cardIn(back)['label']).toBeUndefined();
    expect(cardIn(back)['options']).toEqual({});
  });

  it('turning the footer on appends an empty footer slot', () => {
    const content = contentWith(card(null));
    expect(inspectorForm(targetOf(content, 'C')).data['cardFooter']).toBe(false);
    const next = apply(content, { cardFooter: true });
    const elements = cardIn(next)['elements'] as Uischema[];
    expect(elements).toHaveLength(2);
    expect(elements[1]).toMatchObject({ type: 'VerticalLayout', elements: [] });
  });

  it('turning an empty footer off removes it at once', () => {
    const next = apply(contentWith(card()), { cardFooter: false });
    expect((cardIn(next)['elements'] as Uischema[]).map((e) => e['id'])).toEqual(['c']);
  });
});

function Harness({ onChange }: { onChange: (content: DocumentContent) => void }) {
  const [content, setContent] = useState(
    contentWith(card([{ id: 'n', type: 'Control', scope: '#/properties/name' }])),
  );
  return (
    <InspectorSettings
      content={content}
      pageSelectedId="C"
      focusedId="F"
      formId="F"
      governance={undefined}
      onContentChange={(next) => {
        setContent(next);
        onChange(next);
      }}
    />
  );
}

describe('removing a footer that holds elements (doc 273 rule 9)', () => {
  it('asks first, then removes the footer and its orphaned properties', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(screen.getByRole('switch', { name: 'Show footer' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Remove 1 element?');
    expect(dialog).toHaveTextContent('"Name" is in the card footer and will be deleted.');
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const next = onChange.mock.lastCall![0] as DocumentContent;
    expect((cardIn(next)['elements'] as Uischema[]).map((e) => e['id'])).toEqual(['c']);
    expect(next.schema['properties']).toEqual({});
  });

  it('keeps the footer on cancel', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.click(screen.getByRole('switch', { name: 'Show footer' }));
    await screen.findByRole('alertdialog');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('switch', { name: 'Show footer' })).toBeChecked();
  });
});
