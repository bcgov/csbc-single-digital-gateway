import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DocumentContent } from '../src/studio/document-types';
import { InspectorSettings } from '../src/studio/inspector/inspector-settings';
import { control, form } from './funnel-fixtures';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@repo/ui/sonner', () => ({ toast }));

const CONTENT: DocumentContent = {
  schema: {
    type: 'object',
    properties: { name: { type: 'string', title: 'Name' }, age: { type: 'number', title: 'Age' } },
    required: ['name'],
  },
  variants: {
    default: form('F', 'Page', [
      control('name'),
      {
        ...control('age'),
        rule: { effect: 'SHOW', condition: { scope: '#/properties/name', schema: { const: 'x' } } },
      },
    ]),
  },
};

function Harness({
  selected = 'c-name',
  onChange,
}: {
  selected?: string;
  onChange?: (content: DocumentContent) => void;
}) {
  const [content, setContent] = useState(CONTENT);
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

const chip = () => screen.getByRole('button', { name: 'Data key name' });
const editor = () => screen.queryByRole('textbox', { name: 'Data key' });
const pause = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

/** userEvent installs its own clipboard; spy on it after setup. */
function setup() {
  const user = userEvent.setup();
  const writeText = vi.spyOn(navigator.clipboard, 'writeText');
  return { user, writeText };
}

afterEach(() => {
  vi.restoreAllMocks();
  toast.success.mockClear();
  toast.error.mockClear();
});

describe('inspector header (doc 257 rules 1-4)', () => {
  it('shows the kind, then a Data key row with the key as a truncating code chip on the right', () => {
    render(<Harness />);
    const header = document.querySelector('[data-slot="inspector-header"]')!;
    expect(header.querySelector('[data-slot="inspector-kind"]')).toHaveTextContent(/^Text$/);
    expect(header).toHaveTextContent(/^Text$/);
    const row = document.querySelector('[data-slot="inspector-data-key"]')!;
    expect(row.firstElementChild).toHaveTextContent(/^Data key$/);
    const key = row.querySelector('[data-slot="property-key"]')!;
    expect(key).toHaveTextContent(/^name$/);
    expect(key).toHaveClass('font-mono', 'truncate');
    expect(key).toHaveAttribute('title', expect.stringContaining('name'));
    expect(header).not.toHaveTextContent('Name');
  });

  it('shows the kind alone for a target with no bound property', () => {
    render(
      <InspectorSettings
        content={CONTENT}
        pageSelectedId={null}
        focusedId="F"
        formId="F"
        onContentChange={() => {}}
      />,
    );
    expect(document.querySelector('[data-slot="inspector-header"]')).toHaveTextContent(/^Form$/);
    expect(document.querySelector('[data-slot="inspector-data-key"]')).toBeNull();
    expect(document.querySelector('[data-slot="inspector-shared"]')).toBeNull();
  });
});

describe('copy (doc 257 rules 5-7)', () => {
  it('a single click copies the key after the double-click window and announces it', async () => {
    const { user, writeText } = setup();
    render(<Harness />);
    await user.click(chip());
    expect(writeText).not.toHaveBeenCalled();
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('name'));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('ID copied to clipboard', { description: 'name' }),
    );
    await expect(navigator.clipboard.readText()).resolves.toBe('name');
  });

  it('a double click never copies', async () => {
    const { user, writeText } = setup();
    render(<Harness />);
    await user.dblClick(chip());
    await pause(400);
    expect(writeText).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(editor()).not.toBeNull();
  });

  it('Enter or Space on the chip copies at once; F2 opens the editor', async () => {
    const { user, writeText } = setup();
    render(<Harness />);
    chip().focus();
    await user.keyboard('{Enter}');
    expect(writeText).toHaveBeenCalledWith('name');
    await user.keyboard('{F2}');
    expect(editor()).toHaveFocus();
  });

  it('reports and logs a failed copy', async () => {
    const { user, writeText } = setup();
    writeText.mockRejectedValue(new Error('denied'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Harness />);
    chip().focus();
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't copy the ID", { description: 'name' }),
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  });
});

describe('rename (doc 257 rules 8-12, 16)', () => {
  it('a double click opens an inline editor seeded with the key, all selected', async () => {
    const { user } = setup();
    render(<Harness />);
    await user.dblClick(chip());
    const input = editor() as HTMLInputElement;
    expect(input).toHaveFocus();
    expect(input).toHaveValue('name');
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 4]);
    expect(input).toHaveClass('font-mono');
  });

  it('Enter writes the rename once, cascading, and keeps the element inspected', async () => {
    const { user } = setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.dblClick(chip());
    await user.clear(editor()!);
    await user.type(editor()!, 'fullName{Enter}');
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.lastCall![0] as DocumentContent;
    expect(Object.keys(next.schema['properties'] as object)).toEqual(['fullName', 'age']);
    expect(next.schema['required']).toEqual(['fullName']);
    expect(JSON.stringify(next.variants)).not.toContain('#/properties/name');
    expect(editor()).toBeNull();
    expect(screen.getByRole('button', { name: 'Data key fullName' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Label' })).toHaveValue('Name');
  });

  it('blur commits a valid key', async () => {
    const { user } = setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.dblClick(chip());
    await user.clear(editor()!);
    await user.type(editor()!, 'first');
    fireEvent.blur(editor()!);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Data key first' })).toBeInTheDocument();
  });

  it('Escape cancels without writing, and does not propagate', async () => {
    const { user } = setup();
    const onChange = vi.fn();
    const outer = vi.fn();
    document.addEventListener('keydown', outer);
    render(<Harness onChange={onChange} />);
    await user.dblClick(chip());
    await user.type(editor()!, 'zzz{Escape}');
    document.removeEventListener('keydown', outer);
    expect(editor()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(outer).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
    expect(chip()).toBeInTheDocument();
  });

  it('an unchanged key closes the editor with no write', async () => {
    const { user } = setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.dblClick(chip());
    await user.keyboard('{Enter}');
    expect(editor()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('an invalid key on Enter keeps editing with an alert; on blur it is discarded', async () => {
    const { user } = setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.dblClick(chip());
    await user.clear(editor()!);
    await user.type(editor()!, 'age{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('age is already used.');
    expect(editor()).toHaveAttribute('aria-invalid', 'true');
    expect(editor()).toHaveAccessibleDescription('age is already used.');
    fireEvent.blur(editor()!);
    expect(editor()).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(chip()).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the shared note when several fields bind the property', () => {
    const shared: DocumentContent = {
      ...CONTENT,
      variants: {
        default: form('F', 'Page', [control('name'), { ...control('name'), id: 'c-2' }]),
      },
    };
    render(
      <InspectorSettings
        content={shared}
        pageSelectedId="c-name"
        focusedId="F"
        formId="F"
        onContentChange={() => {}}
      />,
    );
    expect(document.querySelector('[data-slot="inspector-shared"]')).toHaveTextContent(
      /^Shared by 2 fields$/,
    );
  });
});
