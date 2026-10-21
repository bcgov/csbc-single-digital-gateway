import { describe, expect, it } from 'vitest';
import type { Governance } from '../src/studio/capabilities/governance';
import { referenceItemsSchema } from '../src/renderers/ui/document-reference';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { schemaLocked } from '../src/studio/inspector/inspector-field';
import { fieldsFor, inspectorForm } from '../src/studio/inspector/inspector-form';
import { inspectorTarget, KIND_NAMES } from '../src/studio/inspector/inspector-target';
import { cascadeCurrency } from '../src/studio/inspector/option-cascade';

const REF = { component: 'document-reference', documentType: 'services.service' };
const ctl = (id: string, key: string, options: Record<string, unknown>): Uischema => ({
  id,
  type: 'Control',
  scope: `#/properties/${key}`,
  options,
});

/** A default Form and a Mobile Form, each with a reference Control on `refs` and a Money on `price`. */
function content(data?: Record<string, unknown>): DocumentContent {
  return {
    schema: {
      type: 'object',
      properties: {
        refs: { type: 'array', title: 'Refs', items: referenceItemsSchema() },
        price: { type: 'number', title: 'Price' },
      },
    },
    variants: {
      default: {
        id: 'f',
        type: 'Form',
        elements: [ctl('d-refs', 'refs', REF), ctl('d-price', 'price', { component: 'money' })],
      },
      Mobile: {
        id: 'm',
        type: 'Form',
        elements: [ctl('m-refs', 'refs', REF), ctl('m-price', 'price', { component: 'money' })],
      },
    },
    ...(data !== undefined && { data }),
  };
}
const inputs = (id: string, form: string) => ({
  pageSelectedId: id,
  focusedId: form,
  formId: form,
});
const defaultTarget = (c: DocumentContent) => inspectorTarget(c, inputs('d-refs', 'f'))!;
const mobileTarget = (c: DocumentContent) => inspectorTarget(c, inputs('m-refs', 'm'), 'Mobile')!;
const optionsIn = (c: DocumentContent, variant: string, index: number) =>
  ((c.variants[variant]!['elements'] as Uischema[])[index]!['options'] ?? {}) as Record<
    string,
    unknown
  >;
/** The whole inspector form's values with `patch` applied — never a partial set (doc 231 TEST TRAP). */
const valuesWith = (c: DocumentContent, patch: Record<string, unknown>) => ({
  ...(inspectorForm(defaultTarget(c)).data as Record<string, unknown>),
  ...patch,
});
const typeField = (c: DocumentContent) =>
  fieldsFor(defaultTarget(c)).find((field) => field.key === 'documentType');

describe('document reference inspector', () => {
  describe('kind', () => {
    it('classifies a document-reference Control as the document-reference kind', () => {
      const target = defaultTarget(content());
      expect(target.kind).toBe('document-reference');
      expect(KIND_NAMES['document-reference']).toBe('Document reference');
      const plain = { ...content() };
      plain.variants = {
        default: { id: 'f', type: 'Form', elements: [ctl('d-refs', 'refs', {})] },
      };
      expect(defaultTarget(plain).kind).toBe('data-table');
    });
  });

  describe('field', () => {
    it('shows a required Document type select with the three type labels', () => {
      const c = content();
      const field = typeField(c)!;
      expect(field).toMatchObject({ section: 'General', label: 'Document type', required: true });
      const oneOf = field.schema(defaultTarget(c))['oneOf'] as Array<{
        const: string;
        title: string;
      }>;
      expect(oneOf.map((o) => o.title)).toEqual([
        'Service',
        'Service Agreement',
        'Application Method',
      ]);
      expect(field.read(defaultTarget(c))).toBe('services.service');
      // The Display-as select is not offered: one presentation.
      expect(fieldsFor(defaultTarget(c)).some((f) => f.key === 'component')).toBe(false);
    });

    it('writes options.documentType and cascades it to every Control on the property in every variant', () => {
      const c = content();
      const next = applyInspector(
        c,
        defaultTarget(c),
        valuesWith(c, { documentType: 'services.service-agreement' }),
      );
      expect(optionsIn(next, 'default', 0)).toEqual({
        component: 'document-reference',
        documentType: 'services.service-agreement',
      });
      expect(optionsIn(next, 'Mobile', 0)['documentType']).toBe('services.service-agreement');
      // Other properties' Controls are untouched.
      expect(optionsIn(next, 'Mobile', 1)).toEqual({ component: 'money' });
      // Unchanged type → the SAME content.
      expect(applyInspector(c, defaultTarget(c), valuesWith(c, {}))).toBe(c);
    });

    it('is read-only outside the default variant', () => {
      const c = content();
      const target = mobileTarget(c);
      const field = fieldsFor(target).find((f) => f.key === 'documentType')!;
      expect(schemaLocked(field, target)).toBe(true);
      const values = {
        ...(inspectorForm(target).data as Record<string, unknown>),
        documentType: 'services.service-agreement',
      };
      expect(optionsIn(applyInspector(c, target, values), 'Mobile', 0)['documentType']).toBe(
        'services.service',
      );
    });

    it('clears content.data for the property when the type changes', () => {
      const c = content({ refs: [{ id: 's1' }], price: 5 });
      const next = applyInspector(
        c,
        defaultTarget(c),
        valuesWith(c, { documentType: 'services.service-application-method' }),
      );
      expect(next.data).toEqual({ price: 5 });
      const only = content({ refs: [{ id: 's1' }] });
      const cleared = applyInspector(
        only,
        defaultTarget(only),
        valuesWith(only, { documentType: 'services.service-agreement' }),
      );
      expect(cleared).not.toHaveProperty('data');
    });

    it('offers the object-array Min/Max items fields', () => {
      const keys = fieldsFor(defaultTarget(content())).map((f) => f.key);
      expect(keys).toEqual(expect.arrayContaining(['minRows', 'maxRows']));
      expect(keys).not.toEqual(expect.arrayContaining(['addRows']));
      expect(keys).not.toContain('pageSize');
    });
  });

  describe('money', () => {
    it('still cascades currency through the generalised option cascade', () => {
      const c = content();
      const next = cascadeCurrency(c, { key: 'price' }, 'USD');
      expect(optionsIn(next, 'default', 1)).toEqual({ component: 'money', currency: 'USD' });
      expect(optionsIn(next, 'Mobile', 1)['currency']).toBe('USD');
      expect(cascadeCurrency(next, { key: 'price' }, 'USD')).toBe(next);
    });
  });

  describe('governance', () => {
    it('governs documentType as its own setting key', () => {
      const c = content();
      const governance = {
        canEdit: (_id: string, key: string) => key !== 'documentType',
      } as unknown as Governance;
      const next = applyInspector(
        c,
        defaultTarget(c),
        valuesWith(c, { documentType: 'services.service-agreement' }),
        governance,
      );
      expect(optionsIn(next, 'default', 0)['documentType']).toBe('services.service');
    });
  });
});
