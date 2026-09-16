import type { JsonSchema } from '@jsonforms/core';
import type { FlowElement, FormElement } from '../../types/elements';
import type { FormChoice, StudioDocument } from '../../types/index';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from '../sample';
import { FLOW_TEMPLATE_SCHEMA, FLOW_TEMPLATE_UISCHEMA } from './flow-sample';

/** The choices the New form dialog offers, in the order it offers them (doc 200 rule 8). */
export const FORM_CHOICES: readonly FormChoice[] = Object.freeze([
  'new-multi-stage',
  'new-basic',
  'template-multi-stage',
  'template-basic',
]);

/** A blank document's schema: an object with no properties yet. */
const emptySchema = (): JsonSchema => ({ type: 'object', properties: {} });

/** The title every document the studio creates starts with (doc 201 rule 17). */
export const UNTITLED_FORM = 'Untitled form';

const emptyForm = (): FormElement => ({
  type: 'Form',
  label: UNTITLED_FORM,
  elements: [],
});

const emptyFlow = (): FlowElement => ({ type: 'Flow', elements: [], options: { edges: [] } });

/**
 * The document behind one choice (doc 200 rules 8-9, 12-14).
 *
 * Every call returns a FRESH document, deeply detached from the module's constants and from every earlier call. Two
 * reasons, both load-bearing: a shared object would carry one session's edits into the next document of the same
 * choice, and `useStudioDocument` re-seeds on a REFERENTIAL change (`use-studio-document.ts:76`) — handing back the
 * same object would leave the studio showing the old document.
 */
export function documentFor(choice: FormChoice): StudioDocument {
  switch (choice) {
    case 'new-multi-stage':
      return { schema: emptySchema(), uischema: emptyFlow() };
    case 'new-basic':
      return { schema: emptySchema(), uischema: emptyForm() };
    case 'template-multi-stage':
      return {
        schema: structuredClone(FLOW_TEMPLATE_SCHEMA),
        uischema: structuredClone(FLOW_TEMPLATE_UISCHEMA),
      };
    case 'template-basic':
      return {
        schema: structuredClone(STUDIO_SAMPLE_SCHEMA),
        uischema: structuredClone(STUDIO_SAMPLE_UISCHEMA),
      };
  }
}
