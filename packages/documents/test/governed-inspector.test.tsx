import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CapabilityMap } from '../src/studio/capabilities/capability-types';
import { governanceOf } from '../src/studio/capabilities/governance';
import type { DocumentContent } from '../src/studio/document-types';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { InspectorSettings } from '../src/studio/inspector/inspector-settings';
import { inspectorTarget } from '../src/studio/inspector/inspector-target';
import { control, form } from './funnel-fixtures';

const CONTENT: DocumentContent = {
  schema: {
    type: 'object',
    properties: {
      a: { type: 'string', title: 'A' },
      c: { type: 'string', title: 'C', oneOf: [{ const: 'x', title: 'X' }] },
    },
  },
  variants: { default: form('F', 'Page', [control('a'), control('c')]) },
};
const MAP: CapabilityMap = {
  elements: { 'c-a': { edit: ['required'] }, 'c-c': { edit: ['label'] } },
};
const governance = governanceOf(CONTENT, MAP)!;

function show(selected: string, onChange = vi.fn()) {
  render(
    <InspectorSettings
      content={CONTENT}
      pageSelectedId={selected}
      focusedId="F"
      formId="F"
      onContentChange={onChange}
      onEditRule={vi.fn()}
      onEditOptions={vi.fn()}
      governance={governance}
    />,
  );
  return onChange;
}

describe('governed inspector (doc 259 rules 15-18)', () => {
  it('a locked field is read-only; an allowed one stays editable (rule 15)', () => {
    show('c-a');
    expect(screen.getByRole('textbox', { name: 'Label' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Required' })).toBeEnabled();
  });

  it('applyInspector never writes a locked field (backstop)', () => {
    const target = inspectorTarget(CONTENT, {
      pageSelectedId: 'c-a',
      focusedId: 'F',
      formId: 'F',
    })!;
    const next = applyInspector(CONTENT, target, { label: 'Changed', required: true }, governance);
    expect((next.schema['properties'] as Record<string, { title: string }>)['a']!.title).toBe('A');
    expect(next.schema['required']).toEqual(['a']);
  });

  it('a locked Data key still copies but never opens its editor (rule 16)', async () => {
    const user = userEvent.setup();
    show('c-a');
    const chip = screen.getByRole('button', { name: 'Data key a' });
    expect(chip).toHaveAttribute('title', expect.stringContaining('Locked by the template'));
    await user.dblClick(chip);
    expect(screen.queryByRole('textbox', { name: 'Data key' })).toBeNull();
    chip.focus();
    await user.keyboard('{F2}');
    expect(screen.queryByRole('textbox', { name: 'Data key' })).toBeNull();
  });

  it('Add rule is disabled when the Rule is locked (rule 17)', () => {
    show('c-a');
    const section = screen.getByRole('region', { name: 'Rule' });
    expect(within(section).getByRole('button', { name: 'Add rule' })).toBeDisabled();
  });

  it('Edit options is disabled when Options are locked (rule 18)', () => {
    const onEditOptions = vi.fn();
    render(
      <InspectorSettings
        content={CONTENT}
        pageSelectedId="c-c"
        focusedId="F"
        formId="F"
        onContentChange={vi.fn()}
        onEditOptions={onEditOptions}
        governance={governance}
      />,
    );
    const button = within(screen.getByRole('region', { name: 'Options' })).getByRole('button', {
      name: 'Edit options',
    });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onEditOptions).not.toHaveBeenCalled();
  });
});
