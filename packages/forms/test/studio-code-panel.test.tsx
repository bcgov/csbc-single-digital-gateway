import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { renderSeededStudio } from './render-studio';
import { documentText } from '../src/studio/code/document-text';
import { APPLY_DELAY_MS } from '../src/studio/code/use-code-document';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from '../src/studio/sample';

/** Doc 184 rule 19: entering and leaving preview are two buttons now, so one matcher finds whichever shows. */
const PREVIEW_BUTTON = /^(Preview|Exit preview)$/;

// Doc 191 rules 1-5, 16-21, 25-26 — the bottom dock code panel inside FormStudio (editor module mocked).
//
// The mocked editor module is cached for the whole file once loaded, so the tests that observe the FIRST load
// (Suspense fallback) run first.

const fake = vi.hoisted(() => ({ loads: 0, fail: false }));

vi.mock('../src/studio/code/code-editor', async () => {
  fake.loads += 1;
  const { createElement } = await import('react');
  interface Props {
    value: string;
    onChange: (text: string) => void;
    label: string;
    uri: string;
  }
  return {
    CodeEditor: ({ value, onChange, label, uri }: Props) => {
      if (fake.fail) throw new Error('editor failed');
      return createElement('textarea', {
        'aria-label': label,
        'data-uri': uri,
        value,
        onChange: (event: { target: { value: string } }) => onChange(event.target.value),
      });
    },
  };
});

const GREETING = 'Hello, FormStudio!';
const NAME_KEY = 'Vd3kQ9xL';

afterEach(() => {
  fake.fail = false;
  vi.restoreAllMocks();
});

function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`missing ${what}`);
  return value;
}

const slot = (name: string) =>
  required(document.querySelector<HTMLElement>(`[data-slot="${name}"]`), name);
const canvas = () => within(slot('form-studio-center-panel'));
const bottomToggle = () => screen.getByRole('button', { name: 'Bottom panel' });
const paletteItem = (name: string) =>
  within(
    required(document.querySelector<HTMLElement>('[data-studio-palette]'), 'palette'),
  ).getByRole('button', { name });
const statusOf = (editor: HTMLElement) =>
  within(required(editor.closest<HTMLElement>('[data-slot="studio-code-pane"]'), 'pane')).getByRole(
    'status',
  );
const currentCrumb = () =>
  document.querySelector('[data-studio-breadcrumbs] [aria-current="page"]')?.textContent ?? null;
const edit = (editor: HTMLElement, text: string) =>
  fireEvent.change(editor, { target: { value: text } });
const afterApplyDelay = () =>
  act(() => new Promise<void>((done) => setTimeout(done, APPLY_DELAY_MS + 100)));

async function openCode() {
  fireEvent.click(bottomToggle());
  const schema = await screen.findByRole<HTMLTextAreaElement>('textbox', { name: 'Schema' });
  const uischema = await screen.findByRole<HTMLTextAreaElement>('textbox', { name: 'UI schema' });
  return { schema, uischema };
}

// Doc 201 rule 15: an untitled Form is a metaschema problem, so applied text must carry a title.
const uischemaWith = (text: string) =>
  JSON.stringify({
    type: 'Form',
    label: 'Untitled form',
    elements: [{ type: 'Heading', text, options: { level: 1 } }],
  });

describe('Form Studio code panel (doc 191)', () => {
  describe('lazy loading (rules 3-4)', () => {
    it('shows "Loading editor…" while the module loads', async () => {
      renderSeededStudio();
      expect(fake.loads).toBe(0);
      fireEvent.click(bottomToggle());
      expect(screen.getAllByText('Loading editor…')).toHaveLength(2);
      await screen.findByRole('textbox', { name: 'UI schema' });
      expect(screen.queryByText('Loading editor…')).toBeNull();
      expect(fake.loads).toBe(1);
    });

    it('does not load the editor module until the bottom panel first opens', async () => {
      const loads = fake.loads;
      renderSeededStudio();
      expect(slot('form-studio-bottom-panel').childElementCount).toBe(0);
      expect(document.querySelector('[data-studio-code]')).toBeNull();
      expect(fake.loads).toBe(loads);
      await openCode();
      expect(slot('form-studio-bottom-panel').querySelector('[data-studio-code]')).not.toBeNull();
    });

    it('keeps the editors mounted when the bottom panel closes again', async () => {
      renderSeededStudio();
      const { schema } = await openCode();
      edit(schema, '{ "draft": ');
      fireEvent.click(bottomToggle());
      expect(bottomToggle()).toHaveAttribute('aria-pressed', 'false');
      expect(slot('form-studio-bottom-panel')).toHaveAttribute('inert');
      expect(document.body.contains(schema)).toBe(true);
      expect(schema).toHaveValue('{ "draft": ');
    });

    it('shows "The code editor could not be loaded." and logs the cause when the chunk fails', async () => {
      fake.fail = true;
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      renderSeededStudio();
      fireEvent.click(bottomToggle());
      expect(await screen.findAllByText('The code editor could not be loaded.')).toHaveLength(2);
      expect(
        error.mock.calls.some(
          ([message, cause]) =>
            message === 'Form Studio: the code editor could not be loaded.' &&
            cause instanceof Error,
        ),
      ).toBe(true);
      expect(canvas().getByRole('heading', { level: 1, name: GREETING })).toBeInTheDocument();
    });
  });

  describe('panel (rules 1-2)', () => {
    it('renders Schema and UI schema panes side by side in the bottom panel once opened', async () => {
      renderSeededStudio();
      const { schema, uischema } = await openCode();
      const code = required(
        slot('form-studio-bottom-panel').querySelector<HTMLElement>('[data-studio-code]'),
        'code panel',
      );
      const group = required(
        code.querySelector(':scope > [data-slot="resizable-panel-group"]'),
        'group',
      );
      const order = Array.from(group.children).map((child) =>
        child.getAttribute('data-slot') === 'resizable-handle'
          ? 'handle'
          : child.querySelector('[data-slot="studio-code-pane"]')?.getAttribute('data-kind'),
      );
      expect(order).toEqual(['schema', 'handle', 'uischema']);
      expect(
        within(code)
          .getAllByRole('heading', { level: 2 })
          .map((h) => h.textContent),
      ).toEqual(['Schema', 'UI schema']);
      expect(schema.dataset.uri).toMatch(/^inmemory:\/\/form-studio\/[\w-]+\/schema\.json$/);
      expect(uischema.dataset.uri).toMatch(/^inmemory:\/\/form-studio\/[\w-]+\/uischema\.json$/);
    });

    it('keeps the bottom panel closed by default', () => {
      renderSeededStudio();
      expect(bottomToggle()).toHaveAttribute('aria-pressed', 'false');
      expect(slot('form-studio-bottom-panel')).toHaveAttribute('inert');
      expect(document.querySelector('[data-studio-code]')).toBeNull();
    });
  });

  describe('preview (rule 5)', () => {
    it('unmounts the code panel while previewing and remounts it from the current document after', async () => {
      renderSeededStudio();
      const { uischema } = await openCode();
      edit(uischema, uischemaWith('Edited heading'));
      await waitFor(() =>
        expect(canvas().getByRole('heading', { name: 'Edited heading' })).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByRole('button', { name: PREVIEW_BUTTON }));
      expect(document.querySelector('[data-studio-code]')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: PREVIEW_BUTTON }));
      const remounted = await screen.findByRole('textbox', { name: 'UI schema' });
      expect(remounted).not.toBe(uischema);
      expect(remounted).toHaveValue(documentText(JSON.parse(uischemaWith('Edited heading'))));
    });
  });

  describe('text sync (rules 15-18)', () => {
    it('shows each half of the document as formatted JSON', async () => {
      renderSeededStudio();
      const { schema, uischema } = await openCode();
      expect(schema).toHaveValue(documentText(STUDIO_SAMPLE_SCHEMA));
      expect(uischema).toHaveValue(documentText(STUDIO_SAMPLE_UISCHEMA));
      expect(statusOf(schema)).toHaveTextContent('Applied');
      expect(statusOf(uischema)).toHaveTextContent('Applied');
    });

    it('applies valid uischema text to the canvas 300ms after typing stops', async () => {
      renderSeededStudio();
      const { uischema } = await openCode();
      const text = uischemaWith('Edited heading');
      edit(uischema, text);
      expect(statusOf(uischema)).toHaveAttribute('data-status', 'pending');
      expect(canvas().queryByRole('heading', { name: 'Edited heading' })).toBeNull();

      await waitFor(() =>
        expect(
          canvas().getByRole('heading', { level: 1, name: 'Edited heading' }),
        ).toBeInTheDocument(),
      );
      expect(canvas().queryByRole('heading', { name: GREETING })).toBeNull();
      expect(statusOf(uischema)).toHaveTextContent('Applied');
      // The author's own text is kept, not reformatted.
      expect(uischema).toHaveValue(text);
    });

    it('applies valid schema text so the canvas shows the new property title', async () => {
      renderSeededStudio();
      const { schema } = await openCode();
      const next = structuredClone(STUDIO_SAMPLE_SCHEMA) as {
        properties: Record<string, { title?: string }>;
      };
      required(next.properties[NAME_KEY], 'name property').title = 'Full name';
      edit(schema, documentText(next));
      await waitFor(() => expect(canvas().getByText('Full name')).toBeInTheDocument());
      expect(canvas().queryByText('Name', { exact: true })).toBeNull();
      expect(statusOf(schema)).toHaveTextContent('Applied');
    });

    it('does not apply invalid text, keeps it, and reads "Not applied — n problems"', async () => {
      renderSeededStudio();
      const { uischema } = await openCode();
      const unknownType = '{ "type": "Form", "elements": [{ "type": "Group", "elements": [] }] }';
      edit(uischema, unknownType);
      await waitFor(() =>
        expect(statusOf(uischema)).toHaveTextContent(/^Not applied — \d+ problems?$/),
      );
      expect(statusOf(uischema)).toHaveAttribute('data-status', 'invalid');
      expect(statusOf(uischema)).toHaveClass('text-destructive');
      expect(uischema).toHaveValue(unknownType);
      expect(canvas().getByRole('heading', { level: 1, name: GREETING })).toBeInTheDocument();

      edit(uischema, '{');
      await waitFor(() => expect(statusOf(uischema)).toHaveTextContent('Not applied — 1 problem'));
      expect(canvas().getByRole('heading', { level: 1, name: GREETING })).toBeInTheDocument();
    });

    it('does not apply a schema Ajv cannot compile', async () => {
      renderSeededStudio();
      const { schema } = await openCode();
      const next = structuredClone(STUDIO_SAMPLE_SCHEMA) as { properties: Record<string, object> };
      next.properties[NAME_KEY] = { type: 'string', title: 'Broken', minLength: -1 };
      edit(schema, documentText(next));
      await waitFor(() => expect(statusOf(schema)).toHaveTextContent('Not applied — 1 problem'));
      expect(canvas().queryByText('Broken')).toBeNull();
      expect(canvas().getByText('Name')).toBeInTheDocument();
    });
  });

  describe('external changes win (rules 19-21)', () => {
    it('replaces the uischema text after a canvas change', async () => {
      renderSeededStudio();
      const { uischema } = await openCode();
      fireEvent.click(paletteItem('Heading'));
      const document = JSON.parse(uischema.value) as { elements: unknown[] };
      expect(document.elements).toHaveLength(STUDIO_SAMPLE_UISCHEMA.elements.length + 1);
      expect(uischema.value).toContain('"text": "Heading"');
      expect(statusOf(uischema)).toHaveTextContent('Applied');
    });

    it('discards pending or invalid text and cancels its debounce when that half changes externally', async () => {
      renderSeededStudio();
      const { uischema } = await openCode();
      edit(uischema, uischemaWith('Stale'));
      fireEvent.click(paletteItem('Heading'));
      expect(statusOf(uischema)).toHaveTextContent('Applied');
      expect(uischema.value).toContain(`"text": "${GREETING}"`);
      await afterApplyDelay();
      expect(canvas().queryByRole('heading', { name: 'Stale' })).toBeNull();
      expect(canvas().getByRole('heading', { level: 1, name: GREETING })).toBeInTheDocument();

      edit(uischema, '{');
      await waitFor(() => expect(statusOf(uischema)).toHaveAttribute('data-status', 'invalid'));
      fireEvent.click(paletteItem('Heading'));
      expect(statusOf(uischema)).toHaveTextContent('Applied');
      const document = JSON.parse(uischema.value) as { elements: unknown[] };
      expect(document.elements).toHaveLength(STUDIO_SAMPLE_UISCHEMA.elements.length + 2);
    });

    it('leaves a pane untouched when only the other half changed', async () => {
      renderSeededStudio();
      const { schema, uischema } = await openCode();
      const draft = '{ "type": "object", "properties": {';
      edit(schema, draft);
      fireEvent.click(paletteItem('Heading'));
      expect(uischema.value).toContain('"text": "Heading"');
      expect(schema).toHaveValue(draft);
      await waitFor(() => expect(statusOf(schema)).toHaveAttribute('data-status', 'invalid'));
      expect(schema).toHaveValue(draft);
    });

    it('renders without throwing when the uischema references a property the schema no longer has', async () => {
      renderSeededStudio();
      const { schema } = await openCode();
      edit(schema, JSON.stringify({ type: 'object', properties: {} }));
      await waitFor(() => expect(statusOf(schema)).toHaveAttribute('data-status', 'applied'));
      await afterApplyDelay();
      expect(canvas().queryByText('Name', { exact: true })).toBeNull();
      expect(canvas().getByRole('heading', { level: 1, name: GREETING })).toBeInTheDocument();
    });
  });

  describe('keyboard and pointer (rules 25-26)', () => {
    it('does not walk the selection to the parent on Escape inside the code panel', async () => {
      renderSeededStudio();
      const { uischema } = await openCode();
      fireEvent.click(paletteItem('Heading'));
      expect(currentCrumb()).toBe('Heading');

      fireEvent.keyDown(uischema, { key: 'Escape' });
      expect(currentCrumb()).toBe('Heading');

      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(currentCrumb()).not.toBe('Heading');
    });

    it('does not change the selection on a press inside the code panel', async () => {
      renderSeededStudio();
      const { uischema } = await openCode();
      fireEvent.click(paletteItem('Heading'));
      expect(currentCrumb()).toBe('Heading');

      fireEvent.pointerDown(uischema);
      fireEvent.pointerUp(uischema);
      expect(currentCrumb()).toBe('Heading');

      fireEvent.pointerDown(slot('form-studio-center-panel'));
      expect(currentCrumb()).not.toBe('Heading');
    });
  });
});
