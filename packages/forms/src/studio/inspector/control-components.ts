import type { ControlKind } from './inspector-context';
import type { InspectorContext } from './inspector-context';
import { optionsOf } from './inspector-edits';

// Doc 188 rules 26-28: which `options.component` values each control kind offers, and which one actually renders.
// Moved out of inspector-fields.ts (doc 204 Block 4) so BOTH that file and mask-number-fields.ts can ask the
// question with the SAME answer — the Mask setting applies only to a field rendered as an input, and a second
// copy of this test could drift from the one dispatch uses.

interface Component {
  readonly const: string;
  readonly title: string;
}

/** Doc 188 rule 26: each kind's renderers/ui `options.component` values, default first. */
const COMPONENTS: Readonly<Partial<Record<ControlKind, readonly Component[]>>> = {
  text: [
    { const: 'input', title: 'Input' },
    { const: 'textarea', title: 'Textarea' },
  ],
  choice: [
    { const: 'combobox', title: 'Combobox' },
    { const: 'radio-group', title: 'Radio group' },
  ],
  boolean: [
    { const: 'checkbox', title: 'Checkbox' },
    { const: 'switch', title: 'Switch' },
  ],
};

export const componentsOf = (ctx: InspectorContext): readonly Component[] | undefined =>
  ctx.controlKind === undefined ? undefined : COMPONENTS[ctx.controlKind];

/** Rule 27: the authored component when it is one of the kind's, else the default — what actually renders. */
export function currentComponent(ctx: InspectorContext): string | undefined {
  const components = componentsOf(ctx) ?? [];
  const authored = optionsOf(ctx.element)['component'];
  return (components.find((component) => component.const === authored) ?? components[0])?.const;
}
