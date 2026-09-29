/**
 * Stand-ins for `@repo/forms`'s two document surfaces, for platform-web's jsdom tests.
 *
 * jsdom cannot run gridstack or xyflow, so a page test that mounts a template or agreement detail page mocks them —
 * the precedent is `routes/admin.studio.search.test.tsx`. **Doc 200's trap applies:** a file that mocks the studio
 * must not also assert the real studio renders, so the real behaviour is tested in `packages/forms/test/`.
 *
 * Factories rather than components, because `vi.mock` is hoisted above every import: a test file reaches them with
 *
 *     vi.mock('@repo/forms/studio', async () => (await import('<path>/support/mock-forms')).formStudioMock());
 *
 * The studio stub reproduces the ONE behaviour a host page depends on (doc 218 rules 1-2): it reports its baseline
 * once on mount, then reports whatever is typed into it. Everything else about it is the package's business.
 */

export async function formStudioMock() {
  const { useEffect } = await import('react');
  return {
    FormStudio: ({
      schema,
      uischema,
      onDocumentChange,
    }: {
      schema: unknown;
      uischema: unknown;
      onDocumentChange?: (document: unknown) => void;
    }) => {
      useEffect(() => {
        onDocumentChange?.({ schema, uischema });
        // Mount only, exactly as the real studio's baseline emit is.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return (
        <textarea
          data-testid="form-studio"
          aria-label="document"
          value={JSON.stringify({ schema, uischema })}
          onChange={(event) => onDocumentChange?.(JSON.parse(event.target.value))}
        />
      );
    },
    /**
     * Doc 221: a host wraps the studio in this to say what a GOVERNING template permits. The stub is a
     * PASSTHROUGH — enforcement is the package's business and is tested in `packages/forms/test/`;
     * what a page test needs is only that wrapping its studio renders the studio.
     */
    CapabilityProvider: ({ children }: { children?: unknown }) => children,
  };
}

export function formRunnerMock() {
  return {
    /**
     * Doc 230: a FILLABLE runner is a textarea of the answers as JSON (edit it to "type"), and it reports
     * validity the way the real one does — on mount and after every change, never while disabled — from the
     * schema's top-level `required` keys alone.
     */
    FormRunner: ({
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
      data?: Record<string, unknown>;
      onChange?: (data: Record<string, unknown>) => void;
      onValidityChange?: (valid: boolean) => void;
    }) => {
      const answers = data ?? {};
      const valid = (schema?.required ?? []).every(
        (key) => answers[key] !== undefined && answers[key] !== '',
      );
      // Rendered, not an effect: the mock has no state of its own to settle first.
      if (disabled !== true) queueMicrotask(() => onValidityChange?.(valid));
      return (
        <div
          data-testid="form-runner"
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
