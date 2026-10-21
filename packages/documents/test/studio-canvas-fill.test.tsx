import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DRAG_CANCEL } from '../src/renderers/studio/use-vertical-grid';
import { DocumentStudio } from '../src/studio';
import type { DocumentContent } from '../src/studio/document-types';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

// Doc 281: in a FILLABLE studio the canvas controls are live and write `content.data`.

const CONTENT = (data?: Record<string, unknown>): DocumentContent => ({
  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name' },
      people: {
        type: 'array',
        title: 'People',
        items: { type: 'object', properties: { first: { type: 'string', title: 'First' } } },
      },
      faq: {
        type: 'array',
        title: 'Questions',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', title: 'Question', pattern: '\\S' },
            content: { type: 'object', required: ['root'], title: 'Answer' },
          },
          required: ['title', 'content'],
        },
      },
    },
  },
  variants: {
    default: {
      id: 'F',
      type: 'Form',
      label: 'Permit',
      elements: [
        { id: 'n', type: 'Control', scope: '#/properties/name' },
        { id: 'p', type: 'Control', scope: '#/properties/people' },
        {
          id: 'a',
          type: 'Control',
          scope: '#/properties/faq',
          options: { component: 'accordion' },
        },
      ],
    },
  },
  ...(data === undefined ? {} : { data }),
});

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const element = (id: string) => document.querySelector<HTMLElement>(`[data-element-id="${id}"]`)!;
const nameField = () => element('n').querySelector<HTMLInputElement>('input')!;
const toggle = (name: 'Edit' | 'Preview') =>
  within(slot('document-studio-mode')!).getByRole('button', { name });

async function openStudio({
  data,
  fillable = true,
  readOnly = false,
}: { data?: Record<string, unknown>; fillable?: boolean; readOnly?: boolean } = {}) {
  const onContentChange = vi.fn<(content: DocumentContent) => void>();
  const user = userEvent.setup();
  render(
    <DocumentStudio
      content={CONTENT(data)}
      kind="document"
      type="services.service"
      onContentChange={onContentChange}
      fillable={fillable}
      readOnly={readOnly}
    />,
  );
  if (!readOnly) await screen.findByRole('article', { name: 'Permit page' });
  const last = () => onContentChange.mock.calls.at(-1)?.[0];
  return { user, onContentChange, last };
}

describe('canvas fill (doc 281 rules 4-9)', () => {
  it('draws live controls showing the stored answers', async () => {
    await openStudio({ data: { name: 'Ada' } });
    expect(nameField().closest('[inert]')).toBeNull();
    expect(nameField()).toBeEnabled();
    expect(nameField()).toHaveValue('Ada');
  });

  it('writes typed answers into content.data, and the mount echo writes nothing', async () => {
    const { user, onContentChange, last } = await openStudio({ data: { name: 'Ada' } });
    // Give JSONForms' debounced mount emit time to land: it must not count as an edit.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onContentChange).toHaveBeenCalledTimes(1);
    nameField().focus();
    await user.type(nameField(), ' L', { skipClick: true });
    await waitFor(() => expect(last()?.data).toEqual({ name: 'Ada L' }));
    // The form itself is untouched by an answer edit.
    expect(last()?.schema).toEqual(CONTENT().schema);
  });

  it('selects the element whose field is focused by a click', async () => {
    const { user } = await openStudio();
    await user.click(nameField());
    expect(element('n')).toHaveAttribute('data-selected');
  });

  it('keeps controls inert over no answers when the studio is not fillable', async () => {
    await openStudio({ data: { name: 'Ada' }, fillable: false });
    expect(nameField().closest('[inert]')).not.toBeNull();
    expect(nameField()).toHaveValue('');
  });

  it('fills a data table on the canvas: Add row writes a row', async () => {
    const { user, last } = await openStudio();
    await user.click(within(element('p')).getByRole('button', { name: 'Add row' }));
    // Doc 266 rule 2: the shown blank row is written too, then the new one after it.
    await waitFor(() => expect(last()?.data).toEqual({ people: [{}, {}] }));
  });

  it('fills an accordion input on the canvas', async () => {
    const { user, last } = await openStudio();
    const title = within(element('a')).getByRole('textbox', { name: 'Question, item 1' });
    title.focus();
    await user.type(title, 'Why?', { skipClick: true });
    await waitFor(() => expect(last()?.data).toEqual({ faq: [{ title: 'Why?' }] }));
  });
});

describe('preview and read-only (doc 281 rules 8, 20)', () => {
  it('seeds Preview from the stored answers, and typing there never reaches the content', async () => {
    const { user, onContentChange } = await openStudio({ data: { name: 'Ada' } });
    await user.click(toggle('Preview'));
    const field = within(slot('document-preview')!).getByRole('textbox', { name: 'Name' });
    expect(field).toHaveValue('Ada');
    const calls = onContentChange.mock.calls.length;
    field.focus();
    await user.type(field, 'x', { skipClick: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onContentChange).toHaveBeenCalledTimes(calls);
  });

  it('shows a read-only studio its answers — in View (doc 282 rule 16), and in Preview when picked', async () => {
    const { user } = await openStudio({ data: { name: 'Ada' }, readOnly: true });
    expect(within(slot('document-view')!).getByText('Ada')).toBeInTheDocument();
    await user.click(toggle('Preview'));
    const preview = await waitFor(() => slot('document-preview')!);
    expect(within(preview).getByRole('textbox', { name: 'Name' })).toHaveValue('Ada');
  });
});

describe('presses on live controls (doc 281 rule 13)', () => {
  it('never starts a drag from a Base UI control, but still drags by a field label', () => {
    for (const selector of [
      '[role="checkbox"]',
      '[role="switch"]',
      '[role="radio"]',
      '[role="combobox"]',
    ])
      expect(DRAG_CANCEL).toContain(selector);
    // A label is most of a field's grabbable area once its input is live; a click on it never drags anyway.
    expect(DRAG_CANCEL.split(',')).not.toContain('label');
  });
});
