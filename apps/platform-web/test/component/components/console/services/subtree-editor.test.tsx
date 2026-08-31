import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlowActions, FlowStepControl } from '@repo/react/jsonforms-renderers';
import type { UnsavedChangesGuardProps } from '@/components/console/unsaved-changes-guard';
import { SubtreeSectionEditor } from '@/components/console/services/section-edit/subtree-editor';
import type { ServiceVersion } from '@/lib/services';

/**
 * Feature 176 — the `SubtreeSectionEditor` half of the flow layout.
 *
 * This is where the HIGH consistency issue from the data-flow analysis is resolved: `BasicRunner`
 * renders its own Submit after the page, so a flow-variant subtree would otherwise show TWO action
 * bars. The editor mounts `FlowActionProvider` INSTEAD of passing `onSubmit` — `FormRunner` already
 * treats an absent `onSubmit` as no-submit preview mode, so no `FormRunner` change is needed and the
 * citizen application path is untouched.
 *
 * The flow bar's own rendering is covered by @repo/react's 36 layout tests; this file asserts the
 * app-owned half — the detection, the port's contract, and the untouched non-flow path.
 */

const { updateDraftMock, flowRef, stepRef, guardRef, runnerRef } = vi.hoisted(() => ({
  updateDraftMock: vi.fn(),
  flowRef: { current: null as FlowActions | null },
  stepRef: { current: null as FlowStepControl | null },
  guardRef: { current: null as UnsavedChangesGuardProps | null },
  runnerRef: {
    current: null as null | {
      onSubmit?: (data: Record<string, unknown>) => void;
      onChange?: (data: Record<string, unknown>) => void;
      data: Record<string, unknown>;
      definition: { schema: Record<string, unknown>; uischema: Record<string, unknown> };
    },
  },
}));

vi.mock('@/lib/services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/services')>()),
  updateDraft: updateDraftMock,
}));

// Capture what the editor injects into the port. `isFlowVariant` stays REAL — the detection is
// exactly what is under test here.
vi.mock('@repo/react/jsonforms-renderers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@repo/react/jsonforms-renderers')>()),
  FlowActionProvider: ({ value, children }: { value: FlowActions; children: ReactNode }) => {
    flowRef.current = value;
    return <>{children}</>;
  },
  FlowStepProvider: ({ value, children }: { value: FlowStepControl; children: ReactNode }) => {
    stepRef.current = value;
    return <>{children}</>;
  },
}));

// The guard's own dialog is covered in its own file; here we only care about what the editor feeds
// it — the dirty predicate, the save action, and the per-step gate.
vi.mock('@/components/console/unsaved-changes-guard', () => ({
  UnsavedChangesGuard: (props: UnsavedChangesGuardProps) => {
    guardRef.current = props;
    return null;
  },
}));

// FormRunner pulls JSONForms + Lexical; its behaviour is covered in @repo/react. Stand in a stub
// that records whether it was handed an onSubmit, and renders a Submit only when it was — mirroring
// BasicRunner's real no-submit-preview behaviour.
vi.mock('@repo/react/form-runner', () => ({
  FormRunner: (props: {
    definition: { schema: Record<string, unknown>; uischema: Record<string, unknown> };
    data: Record<string, unknown>;
    onChange?: (data: Record<string, unknown>) => void;
    onSubmit?: (data: Record<string, unknown>) => void;
  }) => {
    runnerRef.current = props;
    return props.onSubmit === undefined ? (
      <div data-testid="runner" />
    ) : (
      <button type="button" onClick={() => props.onSubmit?.(props.data)}>
        Save
      </button>
    );
  },
}));

const schema = {
  type: 'object',
  properties: {
    details: { type: 'object', properties: { a: { type: 'string' } } },
  },
};

const categorization = (variant?: string) => ({
  type: 'Categorization',
  ...(variant === undefined ? {} : { options: { variant } }),
  elements: [
    {
      type: 'Category',
      label: 'Overview',
      elements: [{ type: 'Control', scope: '#/properties/details/properties/a' }],
    },
    {
      type: 'Category',
      label: 'Details',
      elements: [{ type: 'Control', scope: '#/properties/details/properties/a' }],
    },
  ],
});

/** A version whose data carries a key this window's uischema does NOT reach. */
const version = () =>
  ({
    id: 'ver-2',
    status: 'draft',
    data: { details: { a: 'kept' }, untouched: { by: 'this window' } },
  }) as unknown as ServiceVersion;

function renderEditor({
  variant,
  stepId,
  withStep = true,
}: { variant?: string; stepId?: string | null; withStep?: boolean } = {}) {
  const onClose = vi.fn();
  const go = vi.fn();
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const step = withStep ? { id: stepId ?? null, go } : undefined;
  render(
    <QueryClientProvider client={client}>
      <SubtreeSectionEditor
        section={{
          id: 'service-description',
          label: 'Service description',
          editor: null,
          actionLabel: null,
          element: { type: 'Group', elements: [categorization(variant)] },
        }}
        schema={schema}
        serviceId="svc-1"
        version={version()}
        onClose={onClose}
        {...(step === undefined ? {} : { step })}
      />
    </QueryClientProvider>,
  );
  return { onClose, go, client };
}

/** Whatever the editor last told the guard about unsaved work. */
const isDirty = () => {
  const when = guardRef.current?.when;
  return typeof when === 'function' ? when() : (when ?? false);
};

const edit = (data: Record<string, unknown>) => {
  act(() => runnerRef.current?.onChange?.(data));
};

const original = () => ({ details: { a: 'kept' }, untouched: { by: 'this window' } });

beforeEach(() => {
  vi.clearAllMocks();
  flowRef.current = null;
  stepRef.current = null;
  guardRef.current = null;
  runnerRef.current = null;
  updateDraftMock.mockResolvedValue({ id: 'ver-2' });
});

describe('SubtreeSectionEditor — flow-variant subtree', () => {
  it('mounts a FlowActionProvider so the flow layout renders its save bar', () => {
    renderEditor({ variant: 'flow' });

    expect(flowRef.current).not.toBeNull();
    expect(typeof flowRef.current?.onSave).toBe('function');
    expect(typeof flowRef.current?.onExit).toBe('function');
  });

  it("renders NO FormRunner Submit button (only the flow bar's save affordances)", () => {
    renderEditor({ variant: 'flow' });

    expect(runnerRef.current?.onSubmit).toBeUndefined();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('persists through updateDraft with the whole merged data object when Save & next runs', async () => {
    renderEditor({ variant: 'flow' });

    await flowRef.current?.onSave({ details: { a: 'edited' }, untouched: { by: 'this window' } });

    expect(updateDraftMock).toHaveBeenCalledWith('svc-1', 'ver-2', {
      data: { details: { a: 'edited' }, untouched: { by: 'this window' } },
    });
  });

  it('leaves the keys outside this window intact in the saved payload', async () => {
    renderEditor({ variant: 'flow' });

    await flowRef.current?.onSave({ details: { a: 'edited' }, untouched: { by: 'this window' } });

    const [, , input] = updateDraftMock.mock.calls[0] as [string, string, { data: unknown }];
    expect(input.data).toHaveProperty('untouched', { by: 'this window' });
  });

  it('surfaces a save failure without closing the window', async () => {
    updateDraftMock.mockRejectedValue(new Error('Draft is locked'));
    const { onClose } = renderEditor({ variant: 'flow' });

    // The port REJECTS, which is the contract the flow bar awaits before navigating.
    const rejection = await flowRef.current
      ?.onSave({ details: { a: 'x' } })
      ?.then(() => null)
      .catch((error: unknown) => error);
    expect(rejection).toBeInstanceOf(Error);
    expect((rejection as Error).message).toBe('Draft is locked');

    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Draft is locked'));
  });

  it('closes the window when Save & exit resolves', async () => {
    const { onClose } = renderEditor({ variant: 'flow' });

    await flowRef.current?.onSave({ details: { a: 'x' } });
    flowRef.current?.onExit();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('SubtreeSectionEditor — non-flow subtree (regression)', () => {
  it('still renders the FormRunner Submit button as before', () => {
    renderEditor();

    expect(runnerRef.current?.onSubmit).toBeTypeOf('function');
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('still mounts no FlowActionProvider', () => {
    renderEditor();

    expect(flowRef.current).toBeNull();
  });

  it('still saves and closes through the existing Submit path', async () => {
    const user = userEvent.setup();
    const { onClose } = renderEditor();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(updateDraftMock).toHaveBeenCalledWith('svc-1', 'ver-2', {
      data: { details: { a: 'kept' }, untouched: { by: 'this window' } },
    });
  });

  it('does not treat an unrecognised variant as flow', () => {
    renderEditor({ variant: 'stepper' });

    expect(flowRef.current).toBeNull();
    expect(runnerRef.current?.onSubmit).toBeTypeOf('function');
  });
});

/**
 * Feature 177 — the editor owns flow knowledge, dirty tracking, and both ports.
 */
describe('SubtreeSectionEditor — step control (feature 177)', () => {
  it('mounts a FlowStepProvider carrying the resolved step id', () => {
    renderEditor({ variant: 'flow', stepId: 'details' });

    expect(stepRef.current?.stepId).toBe('details');
    expect(typeof stepRef.current?.onStepChange).toBe('function');
  });

  it('navigates the URL to the first step id when the URL carries no step', () => {
    const { go } = renderEditor({ variant: 'flow', stepId: null });

    // `replace`, so a bare link doesn't leave a redundant history entry behind it.
    expect(go).toHaveBeenCalledWith('overview', { replace: true });
  });

  it('replaces an unknown step id with the resolved first step', () => {
    // What a link shared before the category was relabelled looks like.
    const { go } = renderEditor({ variant: 'flow', stepId: 'renamed-away' });

    expect(go).toHaveBeenCalledWith('overview', { replace: true });
    expect(stepRef.current?.stepId).toBe('overview');
  });

  it('clears a step segment addressed at a non-flow section', () => {
    const { go } = renderEditor({ stepId: 'overview' });

    expect(go).toHaveBeenCalledWith(undefined, { replace: true });
  });

  it('does not re-navigate once the URL already names the current step', () => {
    const { go } = renderEditor({ variant: 'flow', stepId: 'overview' });

    expect(go).not.toHaveBeenCalled();
  });

  it('passes a step change straight through to the router', () => {
    const { go } = renderEditor({ variant: 'flow', stepId: 'overview' });

    stepRef.current?.onStepChange('details');

    // A push, not a replace: a step is a page, so browser Back walks steps.
    expect(go).toHaveBeenCalledWith('details');
  });

  it('mounts no FlowStepProvider for a non-flow section', () => {
    renderEditor();

    expect(stepRef.current).toBeNull();
  });
});

describe('SubtreeSectionEditor — unsaved changes (feature 177)', () => {
  it('is not dirty on mount, including after JSONForms emits its mount change', () => {
    renderEditor({ variant: 'flow' });
    expect(isDirty()).toBe(false);

    // `@jsonforms/react` emits a debounced onChange on mount with the seeded data.
    edit(original());

    expect(isDirty()).toBe(false);
  });

  it('is dirty once the data differs from the last persisted version', () => {
    renderEditor({ variant: 'flow' });

    edit({ details: { a: 'edited' }, untouched: { by: 'this window' } });

    expect(isDirty()).toBe(true);
  });

  it('is not dirty again when the data is edited back to the persisted value', () => {
    renderEditor({ variant: 'flow' });

    edit({ details: { a: 'edited' }, untouched: { by: 'this window' } });
    edit(original());

    expect(isDirty()).toBe(false);
  });

  it('clears the dirty flag synchronously when a save succeeds, before invalidateQueries resolves', async () => {
    const { client } = renderEditor({ variant: 'flow' });
    const dirtyDuringInvalidate: boolean[] = [];
    vi.spyOn(client, 'invalidateQueries').mockImplementation(async () => {
      dirtyDuringInvalidate.push(isDirty());
    });
    edit({ details: { a: 'edited' }, untouched: { by: 'this window' } });
    expect(isDirty()).toBe(true);

    await flowRef.current?.onSave({ details: { a: 'edited' }, untouched: { by: 'this window' } });

    // The flow layout navigates in the continuation right after this resolves, and that navigation
    // is now blocker-visible — so the flag has to be down BEFORE the awaited invalidate, not after.
    expect(dirtyDuringInvalidate).toEqual([false]);
    expect(isDirty()).toBe(false);
  });

  it('stays dirty when a save fails', async () => {
    updateDraftMock.mockRejectedValue(new Error('Draft is locked'));
    renderEditor({ variant: 'flow' });
    edit({ details: { a: 'edited' }, untouched: { by: 'this window' } });

    await flowRef.current?.onSave({ details: { a: 'edited' } })?.catch(() => null);

    expect(isDirty()).toBe(true);
  });

  it('saves the latest data when the guard dialog asks it to', async () => {
    renderEditor({ variant: 'flow' });
    edit({ details: { a: 'edited' }, untouched: { by: 'this window' } });

    await guardRef.current?.onSave?.();

    expect(updateDraftMock).toHaveBeenCalledWith('svc-1', 'ver-2', {
      data: { details: { a: 'edited' }, untouched: { by: 'this window' } },
    });
    expect(isDirty()).toBe(false);
  });

  it('does not also close a non-flow window when the dialog does the saving', async () => {
    const { onClose } = renderEditor();
    edit({ details: { a: 'edited' }, untouched: { by: 'this window' } });

    await guardRef.current?.onSave?.();

    // The blocked navigation the dialog is about to resume is the one that wins.
    await waitFor(() => expect(updateDraftMock).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps ONE definition object across re-renders, so an in-flight edit is never wiped', () => {
    renderEditor({ variant: 'flow', stepId: 'overview' });
    const first = runnerRef.current?.definition;

    // The re-render that used to do the damage: the flow layout reports its per-step validity, the
    // editor stores it, everything renders again.
    act(() => stepRef.current?.onBlockedChange?.(true));

    // `@jsonforms/react` re-dispatches updateCore whenever `definition.schema`/`uischema` change
    // IDENTITY, and its onChange is debounced ~10ms — so a rebuilt object inside that window resets
    // the form to the parent's `data` and silently drops the edit in flight. (Symptom: "Add
    // question block" appeared to do nothing.)
    expect(runnerRef.current?.definition).toBe(first);
  });

  it('puts the last persisted data back when the dialog discards', () => {
    renderEditor({ variant: 'flow', stepId: 'overview' });
    edit({ details: { a: 'edited' }, untouched: { by: 'this window' } });
    expect(isDirty()).toBe(true);

    act(() => guardRef.current?.onDiscard?.());

    // A step jump leaves this editor MOUNTED, so letting the navigation through is not enough —
    // the discarded values have to leave the form too, or the next jump prompts again.
    expect(runnerRef.current?.data).toEqual(original());
    expect(isDirty()).toBe(false);
    expect(updateDraftMock).not.toHaveBeenCalled();
  });

  it('disables the dialog Save while the current flow step owns a validation error', () => {
    renderEditor({ variant: 'flow', stepId: 'overview' });
    expect(guardRef.current?.saveDisabled).toBe(false);

    act(() => stepRef.current?.onBlockedChange?.(true));

    expect(guardRef.current?.saveDisabled).toBe(true);
    expect(guardRef.current?.saveDisabledReason).toContain('validation error');
  });

  it('leaves the dialog Save enabled for a non-flow section', () => {
    renderEditor();

    expect(guardRef.current?.onSave).toBeTypeOf('function');
    expect(guardRef.current?.saveDisabled).toBe(false);
  });
});
