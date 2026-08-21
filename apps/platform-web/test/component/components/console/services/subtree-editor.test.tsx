import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlowActions } from '@repo/react/jsonforms-renderers';
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

const { updateDraftMock, flowRef, runnerRef } = vi.hoisted(() => ({
  updateDraftMock: vi.fn(),
  flowRef: { current: null as FlowActions | null },
  runnerRef: {
    current: null as null | {
      onSubmit?: (data: Record<string, unknown>) => void;
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
}));

// FormRunner pulls JSONForms + Lexical; its behaviour is covered in @repo/react. Stand in a stub
// that records whether it was handed an onSubmit, and renders a Submit only when it was — mirroring
// BasicRunner's real no-submit-preview behaviour.
vi.mock('@repo/react/form-runner', () => ({
  FormRunner: (props: {
    definition: { schema: Record<string, unknown>; uischema: Record<string, unknown> };
    data: Record<string, unknown>;
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
  ],
});

/** A version whose data carries a key this window's uischema does NOT reach. */
const version = () =>
  ({
    id: 'ver-2',
    status: 'draft',
    data: { details: { a: 'kept' }, untouched: { by: 'this window' } },
  }) as unknown as ServiceVersion;

function renderEditor({ variant }: { variant?: string } = {}) {
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
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
      />
    </QueryClientProvider>,
  );
  return { onClose };
}

beforeEach(() => {
  vi.clearAllMocks();
  flowRef.current = null;
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
