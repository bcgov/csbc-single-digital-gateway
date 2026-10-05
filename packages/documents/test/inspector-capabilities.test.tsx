import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentContent } from '../src/studio/document-types';
import { InspectorSettings } from '../src/studio/inspector/inspector-settings';
import { control, form } from './funnel-fixtures';

const CONTENT: DocumentContent = {
  schema: {
    type: 'object',
    properties: { a: { type: 'string', title: 'A' }, b: { type: 'string', title: 'B' } },
  },
  variants: {
    default: form('F', 'Page', [
      control('a'),
      { id: 'L', type: 'VerticalLayout', elements: [control('b')] },
    ]),
  },
};

function Harness({
  initial = CONTENT,
  selected,
  template = true,
  onChange,
}: {
  initial?: DocumentContent;
  selected: string | null;
  template?: boolean;
  onChange?: (content: DocumentContent) => void;
}) {
  const [content, setContent] = useState(initial);
  const [pick, setPick] = useState(selected);
  return (
    <>
      <button type="button" onClick={() => setPick('c-b')}>
        pick b
      </button>
      <InspectorSettings
        content={content}
        pageSelectedId={pick}
        focusedId="F"
        formId="F"
        templateRules={template}
        onContentChange={(next) => {
          setContent(next);
          onChange?.(next);
        }}
      />
    </>
  );
}

const rules = () => screen.getByRole('region', { name: 'Implementation Rules' });
const headings = () =>
  [...document.querySelectorAll('[data-slot="foldable-section-heading"]')].map(
    (h) => h.textContent,
  );

describe('Implementation Rules section (doc 258 rules 1-5)', () => {
  it('is the last section on a template, with the granted defaults', () => {
    render(<Harness selected="c-a" />);
    expect(headings().at(-1)).toBe('Implementation Rules');
    const section = within(rules());
    expect(section.getByText('This element')).toBeInTheDocument();
    expect(section.queryByText('Its contents')).toBeNull();
    expect(section.getByRole('switch', { name: 'Can be deleted' })).toBeChecked();
    expect(section.getByRole('switch', { name: 'Can be moved' })).toBeChecked();
    expect(section.getByRole('combobox', { name: 'Editable settings' })).toHaveValue('Everything');
    expect(section.queryByRole('combobox', { name: 'Which settings' })).toBeNull();
  });

  it('never shows on a document that is not a template', () => {
    render(<Harness selected="c-a" template={false} />);
    expect(screen.queryByRole('region', { name: 'Implementation Rules' })).toBeNull();
  });

  it('shows Its contents on the root, without delete or move', () => {
    render(<Harness selected={null} />);
    const section = within(rules());
    expect(section.getByText('Its contents')).toBeInTheDocument();
    expect(section.queryByRole('switch', { name: 'Can be deleted' })).toBeNull();
    expect(section.getByRole('switch', { name: 'Can delete elements' })).toBeChecked();
    expect(section.getByRole('combobox', { name: 'Apply changes to' })).toHaveValue(
      'All descendants',
    );
  });

  it('shows Which settings for Specific settings', () => {
    render(
      <Harness
        selected="c-a"
        initial={{ ...CONTENT, capabilities: { elements: { 'c-a': { edit: ['label'] } } } }}
      />,
    );
    const section = within(rules());
    expect(section.getByRole('combobox', { name: 'Editable settings' })).toHaveValue(
      'Specific settings',
    );
    expect(section.getByRole('combobox', { name: 'Which settings' })).toBeInTheDocument();
  });
});

describe('writing (doc 258 rules 6-9)', () => {
  it('a switch writes content.capabilities through onContentChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness selected="c-a" onChange={onChange} />);
    await user.click(within(rules()).getByRole('switch', { name: 'Can be deleted' }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const next = onChange.mock.lastCall![0] as DocumentContent;
    expect(next.capabilities).toEqual({ elements: { 'c-a': { remove: false } } });
    expect(next.variants).toBe(CONTENT.variants);
    expect(within(rules()).getByRole('switch', { name: 'Can be deleted' })).not.toBeChecked();
  });

  it('does not write on mount', async () => {
    const onChange = vi.fn();
    render(<Harness selected="c-a" onChange={onChange} />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a reselected child shows the cascaded value and never writes a stale one back (Forms 231 B1)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness selected="L" onChange={onChange} />);
    await user.click(within(rules()).getByRole('switch', { name: 'Can delete elements' }));
    await waitFor(() =>
      expect(onChange.mock.lastCall?.[0].capabilities.elements['c-b']).toEqual({ remove: false }),
    );
    await user.click(screen.getByRole('button', { name: 'pick b' }));
    await waitFor(() =>
      expect(within(rules()).getByRole('switch', { name: 'Can be deleted' })).not.toBeChecked(),
    );
    const calls = onChange.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onChange.mock.calls.length).toBe(calls);
  });
});
