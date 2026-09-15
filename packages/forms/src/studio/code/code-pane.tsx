import type { DocumentProblem } from './document-text';
import { codeModelUri, LazyCodeEditor, type CodeKind } from './lazy-code-editor';
import { useCodeDocument, type CodeStatus } from './use-code-document';
import type { DocumentCheck } from './validate-document';

export interface CodePaneProps<T> {
  readonly kind: CodeKind;
  /** The pane caption and the editor's accessible name. */
  readonly label: string;
  /** Unique per studio instance, so two studios never share a Monaco model. */
  readonly instanceId: string;
  readonly metaschema: object;
  readonly value: T;
  readonly validate: (value: unknown) => DocumentCheck<T>;
  readonly apply: (value: T) => void;
}

/** Rule 18: "Applied", or how many problems keep the text from applying; nothing while typing. */
function statusText(status: CodeStatus, problems: readonly DocumentProblem[]): string {
  switch (status) {
    case 'applied':
      return 'Applied';
    case 'invalid':
      return `Not applied — ${problems.length} ${problems.length === 1 ? 'problem' : 'problems'}`;
    default:
      return '';
  }
}

const problemList = (problems: readonly DocumentProblem[]) =>
  problems.map(({ path, message }) => `${path || '/'}: ${message}`).join('\n');

/** One code pane (doc 191 rule 1): a caption row with the status above the lazily loaded editor. */
export function CodePane<T>({
  kind,
  label,
  instanceId,
  metaschema,
  value,
  validate,
  apply,
}: CodePaneProps<T>) {
  const code = useCodeDocument({ value, validate, apply });
  const invalid = code.status === 'invalid';

  return (
    <section
      data-slot="studio-code-pane"
      data-kind={kind}
      aria-label={label}
      className="flex h-full min-h-0 flex-col"
    >
      {/* Sizes sit on the h2 and p themselves: base styles size bare headings and paragraphs, so an inherited
          text-xs from the header would not reach them. */}
      <header className="flex h-6 shrink-0 items-center justify-between gap-2 border-b px-2">
        <h2 className="text-xs leading-none font-semibold">{label}</h2>
        <p
          role="status"
          data-status={code.status}
          title={invalid ? problemList(code.problems) : undefined}
          className={`text-[0.6875rem] leading-none ${invalid ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {statusText(code.status, code.problems)}
        </p>
      </header>
      <div className="min-h-0 flex-1">
        <LazyCodeEditor
          uri={codeModelUri(instanceId, kind)}
          metaschema={metaschema}
          value={code.text}
          onChange={code.onChange}
          label={label}
        />
      </div>
    </section>
  );
}
