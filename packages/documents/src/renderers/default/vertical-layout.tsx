import {
  rankWith,
  uiTypeIs,
  type JsonFormsCellRendererRegistryEntry,
  type JsonFormsRendererRegistryEntry,
  type JsonSchema,
  type Layout,
  type LayoutProps,
  type UISchemaElement,
} from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import { GAP_CLASS, layoutGap, type LayoutGap } from './layout-gap';

/** `{ type: 'VerticalLayout' }`, at the base rank (doc 236 rule 3). */
export const verticalLayoutTester = rankWith(1, uiTypeIs('VerticalLayout'));

/** What a vertical body needs to dispatch its children — shared by VerticalLayout and Form (rule 40). */
export interface VerticalBodyProps {
  elements: readonly UISchemaElement[];
  gap: LayoutGap;
  schema: JsonSchema;
  path: string;
  enabled: boolean;
  renderers?: JsonFormsRendererRegistryEntry[] | undefined;
  cells?: JsonFormsCellRendererRegistryEntry[] | undefined;
}

/** A one-column CSS grid of `elements`, in order (doc 236 rules 8-10). */
export function VerticalStack({ elements, gap, ...dispatch }: VerticalBodyProps) {
  return (
    <div
      data-slot="vertical-layout"
      data-gap={gap}
      className={`grid grid-cols-1 ${GAP_CLASS[gap]}`}
    >
      {elements.map((child, index) => (
        <ChildDispatch key={elementKey(child, index)} child={child} {...dispatch} />
      ))}
    </div>
  );
}

/** One child, dispatched through the context's renderers and cells. */
export function ChildDispatch({
  child,
  schema,
  path,
  enabled,
  renderers,
  cells,
}: Omit<VerticalBodyProps, 'elements' | 'gap'> & { child: UISchemaElement }) {
  return (
    <JsonFormsDispatch
      uischema={child}
      schema={schema}
      path={path}
      enabled={enabled}
      {...(renderers !== undefined && { renderers })}
      {...(cells !== undefined && { cells })}
    />
  );
}

export function VerticalLayoutRenderer({ uischema, visible, ...props }: LayoutProps) {
  if (!visible) return null;
  return (
    <VerticalStack
      elements={(uischema as Layout).elements ?? []}
      gap={layoutGap(uischema.options)}
      schema={props.schema}
      path={props.path}
      enabled={props.enabled}
      renderers={props.renderers}
      cells={props.cells}
    />
  );
}

/** A child's React key: its authored id, else its index. */
export function elementKey(element: unknown, index: number): string {
  const id = (element as Record<string, unknown>)['id'];
  return typeof id === 'string' && id !== '' ? id : `#${index}`;
}

export const verticalLayoutEntry = {
  tester: verticalLayoutTester,
  renderer: withJsonFormsLayoutProps(VerticalLayoutRenderer),
};
