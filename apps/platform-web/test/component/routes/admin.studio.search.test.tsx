import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authedUser, mockAuth, renderApp } from '../../support/render-app';

// Doc 197 rules 21-23 — platform-web is the ONLY adapter between the router and the studio; `@repo/forms` never
// imports TanStack Router. FormStudio is mocked here so the focus props can be captured and driven directly.

const { studioProps } = vi.hoisted(() => ({ studioProps: vi.fn() }));

vi.mock('@repo/forms/studio', () => ({
  FormStudio: (props: Record<string, unknown>) => {
    studioProps(props);
    return <div data-slot="form-studio" />;
  },
}));

const { FormStudioPage } = await import('@/components/admin/pages/form-studio-page');
const { studioSearchFor, validateStudioSearch } = await import('@/routes/admin.studio');

type FocusChange = (formId: string | null, meta: { replace: boolean }) => void;

/** The `onFocusedFormChange` the studio was last handed. */
const reportFocus = (): FocusChange => {
  const props = studioProps.mock.calls.at(-1)?.[0] as
    | { onFocusedFormChange?: FocusChange }
    | undefined;
  const report = props?.onFocusedFormChange;
  if (!report) throw new Error('FormStudio was not given onFocusedFormChange');
  return report;
};

const adminUser = { ...authedUser, roles: ['admin'] };

afterEach(() => {
  studioProps.mockClear();
  vi.restoreAllMocks();
});

describe('focus deep linking (doc 197 rules 21-23)', () => {
  it('validates ?form= into { form?: string }, omitting the key when empty or absent', () => {
    expect(validateStudioSearch({ form: 'f1' })).toEqual({ form: 'f1' });
    expect(validateStudioSearch({})).toEqual({});
    expect(validateStudioSearch({ form: '' })).toEqual({});
    expect(validateStudioSearch({ form: 7 })).toEqual({});
    // The key is absent, not explicitly undefined (exactOptionalPropertyTypes).
    expect('form' in validateStudioSearch({ form: '' })).toBe(false);
    expect(validateStudioSearch({ form: 'f1', other: 'x' })).toEqual({ form: 'f1' });
  });

  it('maps a reported address onto the search params, and null onto no key at all', () => {
    expect(studioSearchFor('f1')).toEqual({ form: 'f1' });
    expect(studioSearchFor(null)).toEqual({});
    expect('form' in studioSearchFor(null)).toBe(false);
  });

  it('passes the search param to FormStudio as focusedForm', () => {
    render(<FormStudioPage focusedForm="f1" />);

    expect(studioProps).toHaveBeenCalledWith(expect.objectContaining({ focusedForm: 'f1' }));
  });

  it('navigates with the reported address when the studio changes focus', async () => {
    mockAuth(adminUser);
    const { router } = renderApp('/admin/studio');
    await waitFor(() => expect(studioProps).toHaveBeenCalled(), { timeout: 32000 });

    reportFocus()('f1', { replace: false });

    await waitFor(() => expect(router.state.location.search).toEqual({ form: 'f1' }));
  });

  it('drops the form key from the URL when the reported address is null', async () => {
    mockAuth(adminUser);
    const { router } = renderApp('/admin/studio?form=f1');
    await waitFor(() => expect(studioProps).toHaveBeenCalled(), { timeout: 32000 });
    expect(studioProps).toHaveBeenCalledWith(expect.objectContaining({ focusedForm: 'f1' }));

    reportFocus()(null, { replace: false });

    await waitFor(() => expect(router.state.location.search).toEqual({}));
  });

  it('replaces rather than pushes when the studio reports replace: true', async () => {
    mockAuth(adminUser);
    const { router } = renderApp('/admin/studio?form=nope');
    await waitFor(() => expect(studioProps).toHaveBeenCalled(), { timeout: 32000 });
    const before = router.history.length;

    reportFocus()(null, { replace: true });

    await waitFor(() => expect(router.state.location.search).toEqual({}));
    expect(router.history.length).toBe(before);
  });
});
