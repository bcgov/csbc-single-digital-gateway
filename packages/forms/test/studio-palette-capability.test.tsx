import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CapabilityMap } from '../src/capabilities/index';
import { CapabilityProvider } from '../src/renderers/studio/studio-capabilities';
import { FormStudio } from '../src/studio';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from '../src/studio/sample';

// Doc 221 — the palette goes when nothing on the canvas would accept a new child.
//
// The shell half of `acceptsChildrenAnywhere` (covered pure in studio-capability-gates.test.tsx):
// that the predicate is actually wired to the panel, its content AND its toggle, which is the same
// treatment doc 198 rule 18 gives the Flow canvas. Hiding only the toggle would strand an open panel
// with no way to shut it.

const CLOSED = {
  edit: 'none',
  remove: false,
  move: false,
  addChildren: false,
  removeChildren: false,
  reorderChildren: false,
  edges: false,
} as const;

function renderStudio(value?: CapabilityMap) {
  const studio = <FormStudio schema={STUDIO_SAMPLE_SCHEMA} uischema={STUDIO_SAMPLE_UISCHEMA} />;
  return render(
    value === undefined ? studio : <CapabilityProvider value={value}>{studio}</CapabilityProvider>,
  );
}

const palette = () => document.querySelector('[data-studio-palette]');
const paletteToggle = () => screen.queryByRole('button', { name: 'Left panel' });

describe('the palette under a governing template', () => {
  it('shows for an ungoverned document, exactly as it always has', () => {
    renderStudio();
    expect(palette()).not.toBeNull();
    expect(paletteToggle()).not.toBeNull();
  });

  it('shows when the governing map still opens a container', () => {
    // The sample's root Form carries no authored id, so the `'*'` baseline governs it.
    renderStudio({ default: { '*': CLOSED, Form: { addChildren: true } } });
    expect(palette()).not.toBeNull();
    expect(paletteToggle()).not.toBeNull();
  });

  it('takes the palette AND its toggle away when nothing accepts a child', () => {
    renderStudio({ default: { '*': CLOSED } });
    expect(palette()).toBeNull();
    expect(paletteToggle()).toBeNull();
  });
});
