import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgreementDeleteButton } from '@/components/console/service-agreements/agreement-delete-button';
import type { ServiceAgreementDetail, ServiceAgreementVersion } from '@/lib/service-agreements';

vi.mock('@/lib/service-agreements', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/service-agreements')>()),
  deleteAgreement: vi.fn(),
  deleteAgreementVersion: vi.fn(),
}));

// Doc 225 rules 8-11 — what the button says, and when it is there at all.
//
// The API decides what may go (`detail.deletable`); these cases are about the console rendering that
// answer faithfully rather than counting versions for itself.

const version = (n: number, id: string): ServiceAgreementVersion =>
  ({ id, versionNumber: n, status: 'draft' }) as unknown as ServiceAgreementVersion;

const detailOf = (
  versions: ServiceAgreementVersion[],
  deletable: ServiceAgreementDetail['deletable'],
): ServiceAgreementDetail =>
  ({
    agreement: { id: 'a1' },
    versions,
    definitions: {},
    deletable,
  }) as unknown as ServiceAgreementDetail;

function renderButton(detail: ServiceAgreementDetail, selected?: ServiceAgreementVersion) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AgreementDeleteButton
        id="a1"
        detail={detail}
        selected={selected ?? detail.versions[detail.versions.length - 1]}
        onDeleted={() => {}}
        onVersionDeleted={() => {}}
      />
    </QueryClientProvider>,
  );
}

describe('one version (rule 8)', () => {
  it('offers "Delete service agreement" and no version button', () => {
    // Rule 4: the last version IS the agreement, so the API sends no deletable version ids.
    renderButton(detailOf([version(1, 'v1')], { agreement: true, versionIds: [] }));
    // Just "Delete" (user, 2026-09-28): it is the only delete on screen, so naming the thing adds
    // nothing the page does not already say — and the confirmation states what will happen.
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete version/ })).not.toBeInTheDocument();
  });
});

describe('more than one version (rules 9-10)', () => {
  const versions = [version(1, 'v1'), version(2, 'v2')];

  it('names the version ON SCREEN, not the newest', () => {
    renderButton(
      detailOf(versions, { agreement: false, reason: 'blocked', versionIds: ['v1', 'v2'] }),
      versions[0],
    );
    expect(screen.getByRole('button', { name: /Delete version 1/ })).toBeInTheDocument();
  });

  it('adds the chevron menu when the whole agreement may ALSO go', () => {
    renderButton(detailOf(versions, { agreement: true, versionIds: ['v1', 'v2'] }));
    expect(screen.getByRole('button', { name: /Delete version 2/ })).toBeInTheDocument();
    // The narrower action stays the one-click default; the agreement lives under the chevron.
    expect(screen.getByRole('button', { name: 'More delete options' })).toBeInTheDocument();
  });

  it('offers the version alone when the agreement is blocked', () => {
    renderButton(
      detailOf(versions, {
        agreement: false,
        reason: 'This agreement is a default for Health. Remove it there first.',
        versionIds: ['v2'],
      }),
    );
    expect(screen.getByRole('button', { name: /Delete version 2/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'More delete options' })).not.toBeInTheDocument();
  });

  it('falls back to the agreement button when THIS version may not go', () => {
    // A consented version among deletable ones: the button must follow the selection, not the list.
    renderButton(detailOf(versions, { agreement: true, versionIds: ['v1'] }), versions[1]);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });
});

describe('how the controls look (rules 8, 10)', () => {
  it('draws EVERY delete on the control as destructive', () => {
    renderButton(detailOf([version(1, 'v1')], { agreement: true, versionIds: [] }));
    expect(screen.getByRole('button', { name: 'Delete' }).className).toContain('destructive');
  });

  it('draws the version button and the overflow trigger red too', () => {
    renderButton(
      detailOf([version(1, 'v1'), version(2, 'v2')], {
        agreement: true,
        versionIds: ['v1', 'v2'],
      }),
    );
    expect(screen.getByRole('button', { name: /Delete version 2/ }).className).toContain(
      'destructive',
    );
    // The trigger mirrors the variant's classes rather than reusing it: this `DropdownMenuTrigger`
    // renders its own button and takes no `asChild`.
    expect(screen.getByRole('button', { name: 'More delete options' }).className).toContain(
      'destructive',
    );
  });

  it('ATTACHES the chevron to the version button rather than spacing them', () => {
    // `ButtonGroup`'s default variant is BCDS's semantic grouping, which puts `gap-2` between its
    // children. `joined` is the segmented look the attached pair needs.
    const { container } = renderButton(
      detailOf([version(1, 'v1'), version(2, 'v2')], {
        agreement: true,
        versionIds: ['v1', 'v2'],
      }),
    );
    const group = container.querySelector('[data-slot="button-group"]');
    // Asserting the ATTACHMENT, not the absence of `gap-2` — that string is in the base class either
    // way (`has-[>[data-slot=button-group]]:gap-2`), so "not gap-2" passes and fails for the wrong
    // reasons. These two classes are what `joined` adds and what actually joins the pair.
    expect(group?.className).toContain('border-l-0');
    expect(group?.className).toContain('rounded-l-none');
    // And NO border between them: `joined` drops the second child's left border, but the first keeps
    // a transparent right edge, which shows the page through as a 1px line between two red blocks.
    expect(group?.className).toContain('border-0');
  });
});

describe('the overflow item (rule 10)', () => {
  const openMenu = async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    renderButton(
      detailOf([version(1, 'v1'), version(2, 'v2')], {
        agreement: true,
        versionIds: ['v1', 'v2'],
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'More delete options' }));
    return userEvent;
  };

  it('sizes its own text and refuses to wrap', async () => {
    // A menu item carries no font size of its own, so it inherited the page's 16px and the label
    // wrapped inside a menu sized to a chevron.
    await openMenu();
    const item = await screen.findByRole('menuitem', { name: 'Delete' });
    expect(item.className).toContain('text-sm');
    expect(item.className).toContain('whitespace-nowrap');
  });

  it('PROMPTS when chosen', async () => {
    /**
     * The case that was broken: the item was wired with `onSelect`, which is Radix's API. This menu
     * is Base UI's, so it type-checked, reached the DOM as an unknown prop and was never called —
     * the item looked right and did nothing. Only pressing it catches that, which is why the
     * styling tests above passed throughout.
     */
    const userEvent = await openMenu();
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    expect(
      await screen.findByRole('heading', { name: 'Delete this service agreement?' }),
    ).toBeInTheDocument();
  });
});

describe('nothing deletable (rule 11)', () => {
  it('shows the reason instead of a button the author cannot act on', () => {
    renderButton(
      detailOf([version(1, 'v1')], {
        agreement: false,
        reason: 'Someone has already consented to this agreement, so it can no longer be deleted.',
        versionIds: [],
      }),
    );
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
    expect(screen.getByText(/already consented/)).toBeInTheDocument();
  });
});
