import { rankWith, uiTypeIs, type Layout, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { Heading } from '@repo/ui/heading';
import type { ReactNode } from 'react';
import { layoutGap } from './layout-gap';
import { VerticalStack } from './vertical-layout';

/** `{ type: 'Form' }`, at the base rank (doc 236 rule 39). */
export const formTester = rankWith(1, uiTypeIs('Form'));

/** A Form's title: its `label` when a non-blank string (rule 41), else `undefined`. */
export function formTitle(uischema: unknown): string | undefined {
  const label = (uischema as Record<string, unknown>)['label'];
  return typeof label === 'string' && label.trim() !== '' ? label.trim() : undefined;
}

/** The title's heading (rule 41). The studio draws the same heading, editable (rule 42b). */
export function FormTitle({ children }: { children: ReactNode }) {
  return (
    <Heading data-slot="form-title" level={1} size={1} className="font-semibold">
      {children}
    </Heading>
  );
}

/** A Form: its title, then its elements laid out as a VerticalLayout (doc 236 rules 39-44). */
export function FormRenderer({
  uischema,
  visible,
  schema,
  path,
  enabled,
  renderers,
  cells,
}: LayoutProps) {
  if (!visible) return null;
  const title = formTitle(uischema);
  return (
    <section
      data-slot="form"
      {...(title !== undefined && { 'aria-label': title })}
      className="flex flex-col gap-6"
    >
      {title !== undefined && <FormTitle>{title}</FormTitle>}
      <VerticalStack
        elements={(uischema as Layout).elements ?? []}
        gap={layoutGap(uischema.options)}
        schema={schema}
        path={path}
        enabled={enabled}
        renderers={renderers}
        cells={cells}
      />
    </section>
  );
}

export const formEntry = { tester: formTester, renderer: withJsonFormsLayoutProps(FormRenderer) };
