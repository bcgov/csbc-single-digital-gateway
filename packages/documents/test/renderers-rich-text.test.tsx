import { JsonForms } from '@jsonforms/react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as ui from '../src/renderers/ui/index';
import { richTextControlTester } from '../src/renderers/ui/rich-text-control';
import { editRichText, emptyRichText, richText } from './rich-text-fixtures';

const RICH = { type: 'object', required: ['root'], title: 'Background' };

function renderContent(content: unknown) {
  return render(
    <JsonForms
      schema={{ type: 'object' }}
      uischema={{ type: 'RichContent', options: { content } } as never}
      data={{}}
      renderers={ui.renderers}
    />,
  );
}

function renderControl({
  property = RICH as Record<string, unknown>,
  options,
  data = {},
  required,
  onChange,
}: {
  property?: Record<string, unknown>;
  options?: Record<string, unknown>;
  data?: Record<string, unknown>;
  required?: boolean;
  onChange?: (data: unknown) => void;
} = {}) {
  return render(
    <JsonForms
      schema={{
        type: 'object',
        properties: { bio: property },
        ...(required && { required: ['bio'] }),
      }}
      uischema={
        { type: 'Control', scope: '#/properties/bio', ...(options && { options }) } as never
      }
      data={data}
      renderers={ui.renderers}
      {...(onChange && { onChange: ({ data: next }) => onChange(next) })}
    />,
  );
}

const surface = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[contenteditable="true"]');

describe('ui Rich content (doc 250 rule 4)', () => {
  it('renders options.content through RichTextView', () => {
    const { container } = renderContent(richText('Welcome to the service.'));
    const content = container.querySelector('[data-slot="rich-content"]');
    expect(content).toHaveTextContent('Welcome to the service.');
    expect(content?.querySelector('[data-slot="rich-text-view"]')).not.toBeNull();
    expect(content?.querySelector('[contenteditable="true"]')).toBeNull();
  });

  it('renders nothing for missing, empty-object or malformed content', () => {
    for (const content of [undefined, {}, { root: 'x' }, '<p>hi</p>']) {
      const { container, unmount } = renderContent(content);
      expect(container.querySelector('[data-slot="rich-content"]'), String(content)).toBeNull();
      expect(container).not.toHaveTextContent('No applicable renderer');
      unmount();
    }
  });
});

describe('ui Rich text control (doc 250 rules 5-6)', () => {
  it('claims only a rich text property, at rank 1', () => {
    const control = { type: 'Control', scope: '#/properties/p' } as never;
    const rank = (p: unknown) =>
      richTextControlTester(
        control,
        { type: 'object', properties: { p } } as never,
        {
          rootSchema: { type: 'object', properties: { p } },
          config: {},
        } as never,
      );
    expect(rank(RICH)).toBe(1);
    expect(rank({ type: 'object' })).toBe(-1);
    expect(rank({ type: 'string' })).toBe(-1);
  });

  it('renders label with required marker, description and an editor named by the label', () => {
    const { container } = renderControl({
      property: { ...RICH, description: 'A few lines about you.' },
      required: true,
    });
    const field = container.querySelector('[data-slot="rich-text-field"]')!;
    expect(field.querySelector('[data-slot="field-label"]')).toHaveTextContent('Background *');
    const editor = screen.getByRole('textbox', { name: 'Background' });
    expect(editor).toHaveAccessibleDescription('A few lines about you.');
    expect(field.querySelector('[data-slot="rich-text-toolbar"]')).not.toBeNull();
  });

  it('seeds the editor from data and shows the authored placeholder', () => {
    const { container, unmount } = renderControl({ data: { bio: richText('Teacher') } });
    expect(surface(container)).toHaveTextContent('Teacher');
    unmount();
    const empty = renderControl({ options: { placeholder: 'Tell us about yourself' } });
    expect(empty.container).toHaveTextContent('Tell us about yourself');
  });

  it('writes undefined for a state with no text', async () => {
    const onChange = vi.fn();
    const { container } = renderControl({ data: { bio: richText('x') }, onChange });
    const editable = surface(container)!;
    editable.focus();
    editRichText(editable, richText('Retired teacher'));
    await waitFor(() =>
      expect(JSON.stringify(onChange.mock.lastCall?.[0])).toContain('Retired teacher'),
    );
    editRichText(editable, emptyRichText());
    await waitFor(() => expect(onChange.mock.lastCall?.[0]).toEqual({}));
  });
});
