import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createGridRenderers } from '../src/renderers-gridstack';
import * as studio from '../src/renderers-studio';
import * as ui from '../src/renderers-ui';

// Doc 180 rules 15-17 + 15b — @repo/forms/renderers/studio (ui + draggable Grid, every entry framed).

const schema: JsonSchema = { type: 'object', properties: { hidden: { type: 'boolean' } } };
const testerContext = { rootSchema: schema, config: {} };
const CATEGORIES = ['cells', 'controlRenderers', 'displayRenderers', 'layoutRenderers'] as const;

// A reference factory call — its entries line up 1:1 with the studio's grid entries.
const grid = createGridRenderers();

interface Entry {
  tester: unknown;
  renderer?: { displayName?: string };
  cell?: { displayName?: string };
}

const studioRenderers = () => [
  ...studio.controlRenderers,
  ...studio.displayRenderers,
  ...studio.layoutRenderers,
];

const matching = (type: string) =>
  studioRenderers().filter((entry) => entry.tester({ type }, schema, testerContext) > 0);

function renderStudio(uischema: object, data: Record<string, unknown> = {}) {
  return render(
    <JsonForms
      schema={schema}
      uischema={uischema as UISchemaElement}
      data={data}
      renderers={studioRenderers()}
      cells={studio.cells}
    />,
  );
}

const frames = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-slot="studio-element"]'));

describe('renderers/studio composition', () => {
  it("holds ui's entries followed by the draggable grid factory's entries, 1:1 per category", () => {
    for (const category of CATEGORIES) {
      expect(studio[category], category).toHaveLength(ui[category].length + grid[category].length);
    }
    const last = studio.layoutRenderers.at(-1);
    expect(last?.tester({ type: 'Grid' }, schema, testerContext)).toBe(1);
  });

  it("does not spread default's entries (no second, tied Grid entry)", () => {
    // default = ui + grid, so spreading it as well would double the grid entries.
    expect(studio.layoutRenderers).toHaveLength(ui.layoutRenderers.length + 1);
    expect(matching('Grid')).toHaveLength(1);
  });

  it('preserves every tester reference', () => {
    for (const category of CATEGORIES) {
      const sources: readonly Entry[] = [...ui[category], ...grid[category]];
      const targets: readonly Entry[] = studio[category];
      sources.forEach((source, index) =>
        expect(targets[index]?.tester, category).toBe(source.tester),
      );
    }
  });

  it('replaces every renderer and cell with a wrapped component', () => {
    for (const category of CATEGORIES) {
      const sources: readonly Entry[] = [...ui[category], ...grid[category]];
      const targets: readonly Entry[] = studio[category];
      targets.forEach((target, index) => {
        const wrapped = target.renderer ?? target.cell;
        expect(wrapped, category).not.toBe(sources[index]?.renderer ?? sources[index]?.cell);
        expect(wrapped?.displayName, category).toMatch(/^StudioFrame\(/);
      });
    }
    expect(studio.displayRenderers.length).toBeGreaterThan(0);
  });

  it('holds exactly one entry matching Grid and exactly one matching Heading', () => {
    expect(matching('Grid')).toHaveLength(1);
    expect(matching('Heading')).toHaveLength(1);
  });
});

describe('studio frame', () => {
  it("wraps a rendered Heading in data-slot='studio-element' with data-element-type and a 'Heading' caption", () => {
    const { container } = renderStudio({ type: 'Heading', text: 'Title' });
    const [frame] = frames(container);
    expect(frame).toHaveAttribute('data-element-type', 'Heading');
    expect(frame?.querySelector('[data-slot="studio-element-caption"]')).toHaveTextContent(
      'Heading',
    );
    expect(frame).toContainElement(screen.getByRole('heading', { name: 'Title' }));
  });

  it('draws a dashed border-border outline and a text-muted-foreground caption', () => {
    const { container } = renderStudio({ type: 'Heading', text: 'Title' });
    const [frame] = frames(container);
    expect(frame).toHaveClass('border', 'border-dashed', 'border-border');
    expect(frame?.querySelector('[data-slot="studio-element-caption"]')).toHaveClass(
      'text-muted-foreground',
    );
  });

  it('frames the Grid itself and each element inside it', async () => {
    const { container } = renderStudio({
      type: 'Grid',
      elements: [
        { type: 'Heading', text: 'One' },
        { type: 'Heading', text: 'Two' },
      ],
    });
    const one = await screen.findByRole('heading', { name: 'One' });
    expect(screen.getByRole('heading', { name: 'Two' })).toBeInTheDocument();

    const all = frames(container);
    expect(all.map((frame) => frame.dataset['elementType'])).toEqual([
      'Grid',
      'Heading',
      'Heading',
    ]);
    const [gridFrame] = all;
    expect(gridFrame?.querySelector('.grid-stack')).not.toBeNull();
    expect(one.closest('[data-element-type="Heading"]')).not.toBeNull();
    expect(gridFrame).toContainElement(one);
  });

  it('passes props through unchanged (Heading level and size still apply inside the frame)', () => {
    renderStudio({ type: 'Heading', text: 'Title', options: { level: 3, size: 5 } });
    const heading = screen.getByRole('heading', { level: 3, name: 'Title' });
    expect(heading).toHaveClass('text-h5', 'font-bold');
    expect(heading.closest('[data-slot="studio-element"]')).not.toBeNull();
  });

  it('renders the frame even when a rule hides the element', () => {
    const { container } = renderStudio(
      {
        type: 'Heading',
        text: 'Title',
        rule: {
          effect: 'HIDE',
          condition: { scope: '#/properties/hidden', schema: { const: true } },
        },
      },
      { hidden: true },
    );
    expect(frames(container)).toHaveLength(1);
    expect(frames(container)[0]).toHaveAttribute('data-element-type', 'Heading');
    expect(screen.queryByRole('heading')).toBeNull();
  });
});

describe('studio Grid mode', () => {
  it('renders the studio Grid as draggable/resizable (not grid-stack-static)', async () => {
    const { container } = renderStudio({
      type: 'Grid',
      elements: [{ type: 'Heading', text: 'Drag me' }],
    });
    expect(await screen.findByRole('heading', { name: 'Drag me' })).toBeInTheDocument();
    await act(async () => {});
    const root = container.querySelector('.grid-stack');
    expect(root).not.toBeNull();
    expect(root).not.toHaveClass('grid-stack-static');
  });
});
