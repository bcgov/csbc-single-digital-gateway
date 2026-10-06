import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createDocumentStore, DocumentStudio, STUB_DOCUMENTS } from '../src/studio';
import { useXyflowJsdom } from './xyflow-jsdom';

useXyflowJsdom();

const store = () => createDocumentStore({ seed: STUB_DOCUMENTS });
const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const preview = () => slot('document-preview');
const header = () => slot('document-studio-header')!;
const toggle = (name: 'Edit' | 'Preview') =>
  within(slot('document-studio-mode')!).getByRole('button', { name });
const formNode = (label: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-slot="document-studio-form-node"]')].find(
    (node) => node.textContent?.includes(label),
  )!;

async function open(documentId = 'stub-application') {
  const user = userEvent.setup();
  const view = render(<DocumentStudio documentId={documentId} store={store()} />);
  await screen.findByRole('button', { name: 'Delete Eligibility' });
  return { user, ...view };
}

describe('DocumentStudio preview (doc 247)', () => {
  describe('header (rules 1-3)', () => {
    it('leads the header with an Edit | Preview toggle group, Edit pressed', async () => {
      await open();
      const group = slot('document-studio-mode')!;
      expect(group).toHaveAttribute('aria-label', 'Mode');
      expect(header().firstElementChild).toBe(group);
      expect(toggle('Edit')).toHaveAttribute('aria-pressed', 'true');
      expect(toggle('Preview')).toHaveAttribute('aria-pressed', 'false');
      // The pressed item is BC Gov blue (rule 1c), replacing the Toggle's muted pressed fill.
      for (const name of ['Edit', 'Preview'] as const) {
        expect(toggle(name)).toHaveClass(
          'aria-pressed:bg-bcgov-blue',
          'aria-pressed:text-primary-foreground',
        );
        expect(toggle(name)).not.toHaveClass('aria-pressed:bg-muted');
      }
    });

    it('draws no toggle before a document is open', () => {
      // No kind or type: the New Document dialog asks, and there is no draft yet.
      render(<DocumentStudio store={store()} />);
      expect(slot('document-studio-mode')).toBeNull();
    });

    it('keeps a mode when the pressed item is pressed again', async () => {
      const { user } = await open();
      await user.click(toggle('Edit'));
      expect(toggle('Edit')).toHaveAttribute('aria-pressed', 'true');
      await user.click(toggle('Preview'));
      await user.click(toggle('Preview'));
      expect(toggle('Preview')).toHaveAttribute('aria-pressed', 'true');
      expect(preview()).not.toBeNull();
    });

    it('hides Save and Back in Preview, keeping the Type badge', async () => {
      const { user } = await open();
      fireEvent.doubleClick(formNode('Eligibility'));
      await screen.findByRole('article', { name: 'Eligibility page' });
      // Back leads, left of the toggle (rule 1b).
      const back = screen.getByRole('button', { name: 'Back' });
      expect(header().firstElementChild).toBe(back);
      const group = slot('document-studio-mode');
      expect(back.nextElementSibling).toBe(group);
      await user.click(toggle('Preview'));
      expect(slot('document-studio-mode')).toBe(group);
      // With Back gone, the toggle leads again — the SAME element, never remounted, so it keeps focus.
      expect(header().firstElementChild).toBe(slot('document-studio-mode'));
      expect(toggle('Preview')).toHaveFocus();
      expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
      expect(slot('document-studio-type')).not.toBeNull();
      await user.click(toggle('Edit'));
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    });
  });

  describe('content (rules 5-12)', () => {
    it('replaces canvas, palette, inspector and breadcrumbs with the Funnel renderer', async () => {
      const { user } = await open();
      await user.click(toggle('Preview'));
      expect(preview()).not.toBeNull();
      expect(document.querySelector('.react-flow')).toBeNull();
      expect(screen.queryByRole('region', { name: 'Palette' })).toBeNull();
      expect(screen.queryByRole('region', { name: 'Inspector' })).toBeNull();
      expect(slot('document-studio-footer')!.querySelector('nav')).toBeNull();
      // Doc 274: one Form at a time, with the step rail and the action bar.
      expect(preview()!.querySelector('[data-slot="funnel"]')).not.toBeNull();
      const forms = [...preview()!.querySelectorAll('[data-slot="form"]')];
      expect(forms.map((f) => f.getAttribute('aria-label'))).toEqual(['Eligibility']);
      expect(screen.getByRole('navigation', { name: 'Steps' })).toBeInTheDocument();
      // Real, enabled controls — not the studio's inert ones.
      expect(preview()!.querySelector('[inert]')).toBeNull();
      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByRole('textbox', { name: 'Full name' })).toBeEnabled();
    });

    it('previews only the focused Form, and returns to Edit exactly as left', async () => {
      const { user } = await open();
      fireEvent.doubleClick(formNode('Details'));
      await screen.findByRole('article', { name: 'Details page' });
      await user.click(toggle('Preview'));
      const forms = [...preview()!.querySelectorAll('[data-slot="form"]')];
      expect(forms.map((f) => f.getAttribute('aria-label'))).toEqual(['Details']);
      await user.click(toggle('Edit'));
      expect(await screen.findByRole('article', { name: 'Details page' })).toBeInTheDocument();
    });

    it('starts with fresh data every time Preview is entered', async () => {
      const { user } = await open();
      await user.click(toggle('Preview'));
      await user.click(screen.getByRole('button', { name: 'Next' }));
      const name = screen.getByRole('textbox', { name: 'Full name' });
      fireEvent.change(name, { target: { value: 'Ada' } });
      await waitFor(() => expect(name).toHaveValue('Ada'));
      await user.click(toggle('Edit'));
      await user.click(toggle('Preview'));
      // The runner restarts at the start (doc 274 rule 34).
      expect(screen.queryByRole('textbox', { name: 'Full name' })).toBeNull();
      await user.click(screen.getByRole('button', { name: 'Next' }));
      expect(screen.getByRole('textbox', { name: 'Full name' })).toHaveValue('');
    });

    it('runs a root Form with the action bar, but previews a focused Form without one (doc 274 rule 38)', async () => {
      const { user, rerender } = await open();
      fireEvent.doubleClick(formNode('Details'));
      await screen.findByRole('article', { name: 'Details page' });
      await user.click(toggle('Preview'));
      expect(slot('runner-actions')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
      rerender(<DocumentStudio documentId="stub-agreement-template" store={store()} />);
      await screen.findByRole('article', { name: 'Terms of use page' });
      await user.click(toggle('Preview'));
      expect(slot('document-runner')).not.toBeNull();
      expect(slot('runner-actions')).not.toBeNull();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    });

    it('lays out a focused Form full width in a scrolling column, its content inset (doc 274 rule 40)', async () => {
      const { user } = await open();
      fireEvent.doubleClick(formNode('Details'));
      await screen.findByRole('article', { name: 'Details page' });
      await user.click(toggle('Preview'));
      expect(preview()).toHaveClass('overflow-y-auto');
      expect(preview()!.querySelector('.max-w-3xl')).toBeNull();
      const form = preview()!.querySelector('[data-slot="form"]')!;
      expect(form).toHaveClass('w-full');
      expect(form).not.toHaveClass('px-6');
      expect(form.querySelector('[data-slot="form-header"]')).toHaveClass('px-6');
      expect(form.querySelector(':scope > [data-slot="vertical-layout"]')).toHaveClass(
        'mx-auto',
        'max-w-[980px]',
        'px-10',
        'py-8',
      );
    });

    it('gives a Funnel the whole content area, its Form full width (doc 274 rules 33, 40)', async () => {
      const { user } = await open();
      await user.click(toggle('Preview'));
      expect(preview()).not.toHaveClass('overflow-y-auto');
      expect(preview()!.querySelector('.max-w-3xl')).toBeNull();
      expect(
        preview()!.querySelector('[data-slot="funnel-content"] [data-slot="form"]'),
      ).toHaveClass('w-full');
    });

    it('says there is nothing to preview for a document without Forms', async () => {
      const user = userEvent.setup();
      render(<DocumentStudio store={store()} kind="document" type="services.service" />);
      // A kind and type start a blank draft at once: an empty default variant, no Forms.
      await user.click(toggle('Preview'));
      expect(slot('document-preview-empty')).toHaveTextContent('Nothing to preview yet.');
      expect(preview()!.querySelector('[data-slot="form"]')).toBeNull();
    });
  });

  describe('variants (doc 274 rule 41)', () => {
    it('hides New variant in Preview, keeping the variant tabs', async () => {
      const { user } = await open();
      expect(slot('variant-new')).not.toBeNull();
      await user.click(toggle('Preview'));
      expect(slot('variant-new')).toBeNull();
      expect(screen.getByRole('tablist', { name: 'Variants' })).toBeInTheDocument();
      await user.click(toggle('Edit'));
      expect(slot('variant-new')).not.toBeNull();
    });
  });

  describe('mode reset (rule 4)', () => {
    it('opens another document in Edit', async () => {
      const { user, rerender } = await open();
      await user.click(toggle('Preview'));
      rerender(<DocumentStudio documentId="stub-agreement-template" store={store()} />);
      await screen.findByRole('article', { name: 'Terms of use page' });
      expect(toggle('Edit')).toHaveAttribute('aria-pressed', 'true');
      expect(preview()).toBeNull();
    });
  });
});
