import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderers } from '../src/jsonforms-renderers';
import {
  SectionLayoutRenderer,
  sectionLayoutTester,
} from '../src/jsonforms-renderers/layouts/section-layout';
import { displayRenderers } from '../src/jsonforms-renderers-display';

const schema: JsonSchema = {
  type: 'object',
  properties: {
    first_name: { type: 'string' },
    last_name: { type: 'string' },
  },
};

const testerContext = { rootSchema: schema, config: {} };

function sectionUischema({
  label,
  description,
}: { label?: string; description?: string } = {}): UISchemaElement {
  return {
    type: 'Section',
    ...(label === undefined ? {} : { label }),
    ...(description === undefined ? {} : { options: { description } }),
    elements: [
      { type: 'Control', scope: '#/properties/first_name', label: 'First name' },
      { type: 'Control', scope: '#/properties/last_name', label: 'Last name' },
    ],
  } as unknown as UISchemaElement;
}

function renderSection(
  uischema: UISchemaElement,
  { readonly = false, data = {} }: { readonly?: boolean; data?: Record<string, unknown> } = {},
) {
  return render(
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={renderers}
      cells={[]}
      readonly={readonly}
      onChange={() => {}}
    />,
  );
}

const fieldsetOf = (container: HTMLElement): HTMLFieldSetElement | null =>
  container.querySelector('fieldset');

/**
 * MDD doc 172 — the Section layout: a real <fieldset> with a <legend>, padded on a light grey
 * surface. A pure layout — it holds no value and adds nothing to schema.properties.
 */
describe('Section layout (feature 172)', () => {
  describe('dispatch', () => {
    it('claims a uischema element of type "Section" at rank 1', () => {
      expect(sectionLayoutTester(sectionUischema(), schema, testerContext)).toBe(1);
    });

    it('does not claim Group, HorizontalLayout or GridLayout', () => {
      for (const type of ['Group', 'HorizontalLayout', 'GridLayout', 'VerticalLayout']) {
        const element = { type, elements: [] } as unknown as UISchemaElement;
        expect(sectionLayoutTester(element, schema, testerContext)).toBe(-1);
      }
    });

    it('is registered in the FORM renderer set', () => {
      expect(renderers).toContainEqual({
        tester: sectionLayoutTester,
        renderer: SectionLayoutRenderer,
      });
    });

    it('is registered in the DISPLAY renderer set', () => {
      // The highest-value trap in this feature: display-renderers.tsx lists every layout
      // explicitly, so a form-set-only registration silently breaks every read-only surface.
      expect(displayRenderers).toContainEqual({
        tester: sectionLayoutTester,
        renderer: SectionLayoutRenderer,
      });
    });

    it('renders through the display registry too', () => {
      render(
        <JsonForms
          schema={schema}
          uischema={sectionUischema({ label: 'Applicant details' })}
          data={{ first_name: 'Ada' }}
          renderers={displayRenderers}
          cells={[]}
          onChange={() => {}}
        />,
      );
      expect(screen.getByRole('group', { name: 'Applicant details' })).toBeInTheDocument();
    });
  });

  describe('markup', () => {
    it('wraps its children in a <fieldset>', () => {
      const { container } = renderSection(sectionUischema());
      expect(fieldsetOf(container)).not.toBeNull();
    });

    it('renders the label as a <legend>', () => {
      const { container } = renderSection(sectionUischema({ label: 'Applicant details' }));
      const legend = container.querySelector('legend');
      expect(legend?.textContent).toBe('Applicant details');
    });

    it('groups its controls under the legend for assistive technology', () => {
      // The point of the fieldset: the group is exposed with the legend as its accessible name.
      renderSection(sectionUischema({ label: 'Applicant details' }));
      const group = screen.getByRole('group', { name: 'Applicant details' });
      expect(within(group).getByLabelText('First name')).toBeInTheDocument();
      expect(within(group).getByLabelText('Last name')).toBeInTheDocument();
    });

    it('renders no legend at all when the label is absent or blank', () => {
      for (const uischema of [sectionUischema(), sectionUischema({ label: '   ' })]) {
        const { container, unmount } = renderSection(uischema);
        expect(container.querySelector('legend')).toBeNull();
        unmount();
      }
    });

    it('renders options.description as a paragraph beneath the legend', () => {
      const { container } = renderSection(
        sectionUischema({ label: 'Applicant details', description: 'Tell us who you are.' }),
      );
      const paragraph = container.querySelector('fieldset > p');
      expect(paragraph?.textContent).toBe('Tell us who you are.');
      // Order matters: the description follows the legend.
      const legend = container.querySelector('legend') as HTMLElement;
      expect(legend.compareDocumentPosition(paragraph as HTMLElement)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });

    it('renders no description paragraph when the option is absent or blank', () => {
      for (const uischema of [
        sectionUischema({ label: 'A' }),
        sectionUischema({ label: 'A', description: '  ' }),
      ]) {
        const { container, unmount } = renderSection(uischema);
        expect(container.querySelector('fieldset > p')).toBeNull();
        unmount();
      }
    });

    it('dispatches every child element', () => {
      renderSection(sectionUischema());
      expect(screen.getByLabelText('First name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last name')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('carries the light grey surface and padding', () => {
      const { container } = renderSection(sectionUischema());
      const className = fieldsetOf(container)?.className ?? '';
      // bg-muted is pure #ffffff in this theme — the light grey is the BC scale's gray-10.
      expect(className).toContain('bg-gray-10');
      expect(className).toContain('p-4');
    });

    it('carries min-w-0 so the fieldset can shrink inside a grid or flex parent', () => {
      // Browsers default <fieldset> to min-inline-size: min-content — without min-w-0 a Section
      // inside a Grid column overflows its parent.
      const { container } = renderSection(sectionUischema());
      expect(fieldsetOf(container)?.className ?? '').toContain('min-w-0');
    });
  });

  describe('layout props', () => {
    it('renders nothing when a HIDE rule makes it invisible', () => {
      // Visibility reaches a layout through a uischema rule, not a JsonForms root prop.
      const hidden = {
        ...(sectionUischema({ label: 'Hidden' }) as unknown as Record<string, unknown>),
        rule: {
          effect: 'HIDE',
          condition: { scope: '#/properties/first_name', schema: { const: 'hide' } },
        },
      } as unknown as UISchemaElement;
      const { container } = renderSection(hidden, { data: { first_name: 'hide' } });
      expect(container.querySelector('fieldset')).toBeNull();
    });

    it('passes enabled through to its children', () => {
      renderSection(sectionUischema(), { readonly: true });
      // The text control maps `enabled === false` to `disabled` (text-control.tsx:54).
      expect(screen.getByLabelText('First name')).toBeDisabled();
      expect(screen.getByLabelText('Last name')).toBeDisabled();
    });
  });
});
