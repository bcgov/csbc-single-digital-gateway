/**
 * Stand-ins for `@repo/documents`' two document surfaces, for platform-web's jsdom tests (doc 276).
 *
 * jsdom cannot run gridstack or xyflow, so a page test that mounts a template, agreement or service page mocks them —
 * as the former `mock-forms.tsx` did for `@repo/forms` (the `/admin/studio` tests mock that package inline). A file
 * that mocks the studio must not also assert the real studio renders; the real behaviour is tested in
 * `packages/documents/test/`.
 *
 * Factories rather than components, because `vi.mock` is hoisted above every import: a test file reaches them with
 *
 *     vi.mock('@repo/documents/studio', async () =>
 *       (await import('<path>/support/mock-documents')).documentStudioMock());
 *
 * The studio stub reproduces the ONE behaviour a host page depends on (doc 218 rules 1-2, kept by doc 276): it reports
 * its baseline once on mount, then reports whatever is typed into it. It also exposes what the host asked of it —
 * `data-readonly`, `data-fillable`, `data-kind`, `data-type` and `data-governed-by` — so a page test can assert read-only vs editable
 * and governance without the package.
 */

export async function documentStudioMock() {
  const { useEffect } = await import('react');
  return {
    DocumentStudio: ({
      content,
      kind,
      type,
      readOnly,
      fillable,
      governing,
      onContentChange,
    }: {
      content?: unknown;
      kind?: string;
      type?: string;
      readOnly?: boolean;
      fillable?: boolean;
      governing?: { name: string; capabilities?: unknown };
      onContentChange?: (content: unknown) => void;
    }) => {
      useEffect(() => {
        onContentChange?.(content);
        // Mount only, exactly as the real studio's baseline emit is.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return (
        <textarea
          data-testid="document-studio"
          aria-label="document"
          data-readonly={String(readOnly === true)}
          // Doc 281: whether the host lets staff fill the canvas.
          data-fillable={String(fillable === true)}
          data-kind={kind}
          data-type={type}
          {...(governing !== undefined && { 'data-governed-by': governing.name })}
          value={JSON.stringify(content)}
          onChange={(event) => onContentChange?.(JSON.parse(event.target.value))}
        />
      );
    },
  };
}

export function documentRunnerMock() {
  return {
    /**
     * Doc 230 (kept by doc 276): a FILLABLE runner is a textarea of the answers as JSON (edit it to "type"), and it
     * reports validity the way the real one does — on mount and after every change, never while disabled — from the
     * schema's top-level `required` keys alone.
     */
    DocumentRunner: ({
      disabled,
      actions,
      uischema,
      schema,
      data,
      onChange,
      onValidityChange,
    }: {
      disabled?: boolean;
      actions?: boolean;
      uischema: unknown;
      schema?: { required?: string[] };
      data?: unknown;
      onChange?: (data: unknown) => void;
      onValidityChange?: (valid: boolean) => void;
    }) => {
      const answers = (data ?? {}) as Record<string, unknown>;
      const valid = (schema?.required ?? []).every(
        (key) => answers[key] !== undefined && answers[key] !== '',
      );
      // Rendered, not an effect: the mock has no state of its own to settle first.
      if (disabled !== true) queueMicrotask(() => onValidityChange?.(valid));
      return (
        <div
          data-testid="document-runner"
          data-disabled={String(disabled === true)}
          // Doc 229: whether the host asked for the action bar (the runner's default is true).
          data-actions={String(actions !== false)}
          data-answers={JSON.stringify(answers)}
        >
          {JSON.stringify(uischema)}
          {disabled === true ? null : (
            <textarea
              aria-label="answers"
              value={JSON.stringify(answers)}
              onChange={(event) =>
                onChange?.(JSON.parse(event.target.value) as Record<string, unknown>)
              }
            />
          )}
        </div>
      );
    },
  };
}

export function documentViewMock() {
  return {
    /** Doc 282: the read-only view — what it was asked to show, as text and attributes. */
    DocumentView: ({
      uischema,
      data,
      unanswered,
    }: {
      uischema: unknown;
      data?: unknown;
      unanswered?: 'show' | 'hide';
    }) => (
      <div
        data-testid="document-view"
        data-answers={JSON.stringify(data ?? {})}
        // Doc 283: how blanks are read back.
        data-unanswered={unanswered ?? 'show'}
      >
        {JSON.stringify(uischema)}
      </div>
    ),
  };
}
