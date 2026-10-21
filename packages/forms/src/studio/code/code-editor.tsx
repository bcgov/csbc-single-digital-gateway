import * as monaco from 'monaco-editor';
import { useEffect, useRef, type FC } from 'react';
import type { CodeEditorProps } from './lazy-code-editor';
import { registerMetaschema } from './monaco-schemas';

// The Monaco editor of one code pane (doc 191 rules 6-9, 20) — the lazy chunk. It creates editors straight from the
// self-hosted `monaco-editor` module, never through a shared loader, so no other editor on the page can change which
// Monaco it gets. The root import brings every contrib (suggest, hover) and the top-level `json` language namespace.

const EDITOR_OPTIONS = {
  theme: 'vs',
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 13,
  tabSize: 2,
  scrollBeyondLastLine: false,
  // The dock panel's overflow would clip the suggest and hover widgets.
  fixedOverflowWidgets: true,
  formatOnPaste: true,
} as const satisfies monaco.editor.IStandaloneEditorConstructionOptions;

export const CodeEditor: FC<CodeEditorProps> = ({ uri, metaschema, value, onChange, label }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const adopting = useRef(false);
  const latest = useRef({ value, onChange });
  useEffect(() => {
    latest.current = { value, onChange };
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const model = monaco.editor.createModel(latest.current.value, 'json', monaco.Uri.parse(uri));
    const unregister = registerMetaschema(monaco.json.jsonDefaults, uri, metaschema);
    const editor = monaco.editor.create(container, { ...EDITOR_OPTIONS, model, ariaLabel: label });
    editorRef.current = editor;
    const subscription = editor.onDidChangeModelContent(() => {
      if (!adopting.current) latest.current.onChange(model.getValue());
    });
    return () => {
      subscription.dispose();
      editor.dispose();
      model.dispose();
      unregister();
      editorRef.current = null;
    };
  }, [uri, metaschema, label]);

  // Rule 20: a new value replaces the whole content as ONE edit (so Undo restores the author's text), keeps the
  // cursor and scroll position, and is not reported back as an author edit.
  useEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model || model.getValue() === value) return;
    const viewState = editor.saveViewState();
    adopting.current = true;
    try {
      model.pushEditOperations([], [{ range: model.getFullModelRange(), text: value }], () => null);
    } finally {
      adopting.current = false;
    }
    if (viewState) editor.restoreViewState(viewState);
  }, [value]);

  return <div ref={containerRef} data-slot="studio-code-editor" className="h-full min-h-0" />;
};
