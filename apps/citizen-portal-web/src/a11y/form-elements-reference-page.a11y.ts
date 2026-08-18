import type { ComponentA11yMetadata } from '@repo/ui/a11y-types';

// Pattern page, backed by @repo/react's JsonForms renderers, not a single @repo/ui component.
export default {
  component: 'form-elements',
  wcagCriteria: [
    { id: '3.3.2', name: 'Labels or Instructions', level: 'A' },
    { id: '4.1.2', name: 'Name, Role, Value', level: 'A' },
    { id: '3.3.1', name: 'Error Identification', level: 'A' },
  ],
  rules: [
    {
      id: 'uischema-label-required',
      description:
        'Labels and descriptions come from the uischema label and schema description — the renderers wire these to the input via FieldWrapper, so a missing label means a missing accessible name.',
      severity: 'required',
    },
  ],
  commonMisuses: [],
  notes: [
    'Always test generated controls with a keyboard and check that validation errors are announced, not just shown visually — this has not been fully audited yet.',
  ],
  knownExceptions: [],
} satisfies ComponentA11yMetadata;
