import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentContent } from '../src/studio/document-types';
import { InspectorSettings } from '../src/studio/inspector/inspector-settings';
import { control, form, funnel } from './funnel-fixtures';

const CONTENT: DocumentContent = {
  schema: {
    type: 'object',
    properties: { name: { type: 'string', title: 'Name', maxLength: 5 } },
  },
  variants: {
    default: form('F', 'Page', [control('name'), control('name'), { id: 's', type: 'Separator' }]),
  },
};

/** The studio's side: holds the content and passes every edit back in. */
function Harness({
  initial = CONTENT,
  selected,
  onChange,
}: {
  initial?: DocumentContent;
  selected: string | null;
  onChange?: (content: DocumentContent) => void;
}) {
  const [content, setContent] = useState(initial);
  return (
    <InspectorSettings
      content={content}
      pageSelectedId={selected}
      focusedId="F"
      formId="F"
      onContentChange={(next) => {
        setContent(next);
        onChange?.(next);
      }}
    />
  );
}

const sections = () =>
  [...document.querySelectorAll('[data-slot="foldable-section"]')].map(
    (s) => s.querySelector('[data-slot="foldable-section-heading"]')?.textContent,
  );

describe('InspectorSettings (doc 249)', () => {
  it('shows the target line and the fields as labelled controls in headed sections', () => {
    render(<Harness selected="c-name" />);
    expect(document.querySelector('[data-slot="inspector-kind"]')).toHaveTextContent(/^Text$/);
    expect(document.querySelector('[data-slot="property-key"]')).toHaveTextContent(/^name$/);
    expect(document.querySelector('[data-slot="inspector-shared"]')).toHaveTextContent(
      'Shared by 2 fields',
    );
    expect(sections()).toEqual(['General', 'Validation', 'Appearance']);
    expect(screen.getByRole('textbox', { name: 'Label' })).toHaveValue('Name');
    expect(screen.getByRole('switch', { name: 'Required' })).not.toBeChecked();
    expect(screen.getByRole('textbox', { name: 'Maximum length' })).toHaveValue('5');
  });

  it('shows Nothing to inspect without a target and No properties to edit for a Separator', () => {
    const { unmount } = render(
      <InspectorSettings
        content={{ schema: {}, variants: { default: {} } }}
        pageSelectedId={null}
        focusedId={null}
        formId={null}
        onContentChange={() => {}}
      />,
    );
    expect(screen.getByText('Nothing to inspect.')).toBeInTheDocument();
    unmount();
    render(<Harness selected="s" />);
    expect(document.querySelector('[data-slot="inspector-header"]')).toHaveTextContent(
      /^Separator$/,
    );
    expect(document.querySelector('[data-slot="property-key"]')).toBeNull();
    expect(screen.getByText('No properties to edit.')).toBeInTheDocument();
  });

  it('applies an edit through onContentChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness selected="c-name" onChange={onChange} />);
    await user.click(screen.getByRole('switch', { name: 'Required' }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.lastCall?.[0].schema.required).toEqual(['name']);
  });

  it('does not call onContentChange on mount', async () => {
    const onChange = vi.fn();
    render(<Harness selected="c-name" onChange={onChange} />);
    render(<Harness selected={null} onChange={onChange} />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps focus in a field while typing across several edits', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness selected="c-name" onChange={onChange} />);
    const label = screen.getByRole('textbox', { name: 'Label' });
    await user.clear(label);
    await user.type(label, 'Full name ');
    await waitFor(() =>
      expect(onChange.mock.lastCall?.[0].schema.properties.name.title).toBe('Full name '),
    );
    expect(screen.getByRole('textbox', { name: 'Label' })).toBe(label);
    expect(label).toHaveFocus();
    expect(label).toHaveValue('Full name ');
    expect(document.querySelector('[data-slot="inspector-header"]')).toHaveTextContent(/^Text$/);
  });

  it('shows the field error and does not write an invalid value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const single: DocumentContent = {
      schema: { type: 'object', properties: { n: { type: 'number' } } },
      variants: { default: funnel([form('F', 'F', [control('n')])], []) },
    };
    render(<Harness initial={single} selected="c-n" onChange={onChange} />);
    const step = screen.getByRole('textbox', { name: 'Step' });
    await user.type(step, '0');
    await user.tab();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Step must be > 0.'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
