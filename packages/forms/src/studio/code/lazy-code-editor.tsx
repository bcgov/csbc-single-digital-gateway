import { Component, lazy, Suspense, type ErrorInfo, type FC, type ReactNode } from 'react';

// The boundary of the lazily loaded code editor (doc 191 rules 3-4, 6). Nothing here imports Monaco: the editor
// module, and `monaco-editor` with it, is fetched the first time a `LazyCodeEditor` renders.

export type CodeKind = 'schema' | 'uischema';

export interface CodeEditorProps {
  /** The Monaco model URI — unique per studio instance and pane (`codeModelUri`). */
  readonly uri: string;
  /** The JSON Schema driving completion, hover docs and markers. */
  readonly metaschema: object;
  /** The text to show. A new value replaces the editor's content as one undoable edit (rule 20). */
  readonly value: string;
  /** Called with the full text after every edit the author makes — never for an adopted `value`. */
  readonly onChange: (text: string) => void;
  /** The editor's accessible name. */
  readonly label: string;
}

/** Rule 8 / Data Model: `inmemory://form-studio/<instanceId>/<kind>.json`, the id reduced to URI-safe characters. */
export const codeModelUri = (instanceId: string, kind: CodeKind): string =>
  `inmemory://form-studio/${instanceId.replace(/[^\w-]/g, '') || 'studio'}/${kind}.json`;

const CodeEditor = lazy(() =>
  import('./code-editor').then((module) => ({ default: module.CodeEditor })),
);

const MESSAGE_CLASS = 'p-2 text-xs text-muted-foreground';

interface BoundaryState {
  readonly failed: boolean;
}

/** Rule 4: a failed chunk (or editor) renders a message in the pane; the studio keeps working. */
class CodeEditorBoundary extends Component<{ readonly children: ReactNode }, BoundaryState> {
  override state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Form Studio: the code editor could not be loaded.', error, info.componentStack);
  }

  override render(): ReactNode {
    return this.state.failed ? (
      <p role="alert" className={MESSAGE_CLASS}>
        The code editor could not be loaded.
      </p>
    ) : (
      this.props.children
    );
  }
}

export const LazyCodeEditor: FC<CodeEditorProps> = (props) => (
  <CodeEditorBoundary>
    <Suspense fallback={<p className={MESSAGE_CLASS}>Loading editor…</p>}>
      <CodeEditor {...props} />
    </Suspense>
  </CodeEditorBoundary>
);
