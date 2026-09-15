import { readdirSync, readFileSync } from 'node:fs';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { CodeEditor } from '../src/studio/code/code-editor';
import { codeModelUri } from '../src/studio/code/lazy-code-editor';
import { SCHEMA_METASCHEMA } from '../src/studio/code/metaschema/schema-metaschema';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';

// Doc 191 rules 6-9, 20 — the lazily loaded Monaco editor (monaco-editor mocked: jsdom cannot run Monaco).

const fake = vi.hoisted(() => {
  type Listener = () => void;
  interface Options {
    [key: string]: unknown;
  }

  class FakeModel {
    readonly listeners: Listener[] = [];
    readonly dispose = vi.fn();
    constructor(
      public value: string,
      public readonly language: string,
      public readonly uri: { toString(): string },
    ) {}
    getValue() {
      return this.value;
    }
    getFullModelRange() {
      return { startLineNumber: 1, startColumn: 1, endLineNumber: 99, endColumn: 1 };
    }
    readonly pushEditOperations = vi.fn((_selections: unknown, edits: { text: string }[]) => {
      this.value = edits[0]?.text ?? this.value;
      for (const listener of this.listeners) listener();
      return null;
    });
    /** Simulates the author typing. */
    type(text: string) {
      this.value = text;
      for (const listener of this.listeners) listener();
    }
  }

  const state = {
    models: [] as FakeModel[],
    editors: [] as ReturnType<typeof createEditor>[],
    jsonDefaults: {
      diagnosticsOptions: {} as { schemas?: { uri: string }[]; [key: string]: unknown },
      setDiagnosticsOptions: vi.fn((options: { schemas?: { uri: string }[] }) => {
        state.jsonDefaults.diagnosticsOptions = options;
      }),
    },
  };

  function createEditor(container: HTMLElement, options: Options & { model: FakeModel }) {
    const subscription = { dispose: vi.fn() };
    return {
      container,
      options,
      subscription,
      getModel: () => options.model,
      onDidChangeModelContent: (listener: Listener) => {
        options.model.listeners.push(listener);
        return subscription;
      },
      saveViewState: vi.fn(() => ({ cursor: 'saved' })),
      restoreViewState: vi.fn(),
      dispose: vi.fn(),
    };
  }

  const module = {
    Uri: { parse: (value: string) => ({ toString: () => value }) },
    json: { jsonDefaults: state.jsonDefaults },
    editor: {
      createModel: vi.fn((value: string, language: string, uri: { toString(): string }) => {
        const model = new FakeModel(value, language, uri);
        state.models.push(model);
        return model;
      }),
      create: vi.fn((container: HTMLElement, options: Options & { model: FakeModel }) => {
        const editor = createEditor(container, options);
        state.editors.push(editor);
        return editor;
      }),
    },
  };
  return { state, module };
});

vi.mock('monaco-editor', () => fake.module);

const SCHEMA_URI = codeModelUri('r1', 'schema');
const OTHER = { uri: 'inmemory://other.json', fileMatch: ['inmemory://other.json'], schema: {} };

function renderEditor(props: Partial<Parameters<typeof CodeEditor>[0]> = {}) {
  const onChange = vi.fn();
  const all = {
    uri: SCHEMA_URI,
    metaschema: SCHEMA_METASCHEMA,
    value: '{}',
    onChange,
    label: 'Schema',
    ...props,
  };
  const view = render(<CodeEditor {...all} />);
  return { ...view, onChange, props: all };
}

const registeredUris = () =>
  (fake.state.jsonDefaults.diagnosticsOptions.schemas ?? []).map((entry) => entry.uri);

beforeEach(() => {
  fake.state.models.length = 0;
  fake.state.editors.length = 0;
  fake.state.jsonDefaults.diagnosticsOptions = { validate: false, schemas: [OTHER] };
  vi.clearAllMocks();
});

describe('Form Studio CodeEditor (doc 191)', () => {
  describe('creation (rules 6, 8, 9)', () => {
    it('creates a json model at the per-instance URI and an editor with the documented options', () => {
      const { container } = renderEditor({ value: '{ "type": "object" }' });
      const [model] = fake.state.models;
      expect(model?.value).toBe('{ "type": "object" }');
      expect(model?.language).toBe('json');
      expect(model?.uri.toString()).toBe('inmemory://form-studio/r1/schema.json');

      const [editor] = fake.state.editors;
      expect(editor?.container).toBe(container.querySelector('[data-slot="studio-code-editor"]'));
      expect(editor?.options).toMatchObject({
        model,
        ariaLabel: 'Schema',
        theme: 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        tabSize: 2,
        scrollBeyondLastLine: false,
        fixedOverflowWidgets: true,
        formatOnPaste: true,
      });
    });

    it('never imports @monaco-editor/react or configures its loader', () => {
      const dir = `${import.meta.dirname}/../src/studio/code`;
      const sources = readdirSync(dir, { recursive: true })
        .map(String)
        .filter((file) => /\.tsx?$/.test(file))
        .map((file) => readFileSync(`${dir}/${file}`, 'utf8'));
      expect(sources.length).toBeGreaterThan(3);
      for (const source of sources) {
        expect(source).not.toMatch(/from ['"]@monaco-editor\//);
        expect(source).not.toMatch(/loader\.config\(/);
      }
      expect(readFileSync(`${dir}/code-editor.tsx`, 'utf8')).toMatch(/from 'monaco-editor'/);
    });
  });

  describe('metaschema registration (rules 7-8)', () => {
    it('adds its metaschema to monaco.json.jsonDefaults with fileMatch on its model URI, keeping other entries', () => {
      renderEditor();
      const schemas = fake.state.jsonDefaults.diagnosticsOptions.schemas;
      expect(schemas).toContainEqual(OTHER);
      expect(schemas).toContainEqual({
        uri: SCHEMA_URI,
        fileMatch: [SCHEMA_URI],
        schema: SCHEMA_METASCHEMA,
      });
      expect(registeredUris().filter((uri) => uri === SCHEMA_URI)).toHaveLength(1);
    });

    it('sets validate, no schema requests, no comments, trailing commas and schema validation as errors', () => {
      renderEditor();
      expect(fake.state.jsonDefaults.diagnosticsOptions).toMatchObject({
        validate: true,
        enableSchemaRequest: false,
        allowComments: false,
        trailingCommas: 'error',
        schemaValidation: 'error',
      });
    });

    it('removes its entry and disposes the model and editor on unmount', () => {
      const { unmount } = renderEditor();
      const [model] = fake.state.models;
      const [editor] = fake.state.editors;
      unmount();
      expect(editor?.subscription.dispose).toHaveBeenCalledTimes(1);
      expect(editor?.dispose).toHaveBeenCalledTimes(1);
      expect(model?.dispose).toHaveBeenCalledTimes(1);
      expect(registeredUris()).toEqual([OTHER.uri]);
    });

    it('supports two studio instances without a model URI collision', () => {
      const first = codeModelUri('«r1»', 'uischema');
      const second = codeModelUri(':r2:', 'uischema');
      expect(first).toBe('inmemory://form-studio/r1/uischema.json');
      expect(second).not.toBe(first);

      const a = renderEditor({ uri: first, metaschema: UISCHEMA_METASCHEMA });
      renderEditor({ uri: second, metaschema: UISCHEMA_METASCHEMA });
      expect(fake.state.models.map((model) => model.uri.toString())).toEqual([first, second]);
      expect(registeredUris()).toEqual([OTHER.uri, first, second]);
      a.unmount();
      expect(registeredUris()).toEqual([OTHER.uri, second]);
    });
  });

  describe('text flow (rule 20)', () => {
    it('reports author edits through onChange', () => {
      const { onChange } = renderEditor();
      act(() => fake.state.models[0]?.type('{ "title": "x" }'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('{ "title": "x" }');
    });

    it('adopts a new value with one pushEditOperations edit, restores view state and does not call onChange', () => {
      const { onChange, rerender, props } = renderEditor();
      const [model] = fake.state.models;
      const [editor] = fake.state.editors;
      rerender(<CodeEditor {...props} value='{ "type": "object" }' />);
      expect(model?.pushEditOperations).toHaveBeenCalledTimes(1);
      expect(model?.pushEditOperations.mock.calls[0]?.[1]).toEqual([
        { range: model?.getFullModelRange(), text: '{ "type": "object" }' },
      ]);
      expect(model?.value).toBe('{ "type": "object" }');
      expect(editor?.restoreViewState).toHaveBeenCalledWith({ cursor: 'saved' });
      expect(onChange).not.toHaveBeenCalled();
      expect(fake.state.editors).toHaveLength(1);

      rerender(<CodeEditor {...props} value='{ "type": "object" }' />);
      expect(model?.pushEditOperations).toHaveBeenCalledTimes(1);
    });
  });
});
