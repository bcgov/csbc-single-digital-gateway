import { rankWith, uiTypeIs, type Layout, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { Heading } from '@repo/ui/heading';
import { RichTextView } from '@repo/ui/rich-text-view';
import type { ReactNode } from 'react';
import {
  plainRichText,
  richTextHasText,
  richTextValue,
  type RichTextState,
} from '../ui/rich-text-value';
import { layoutGap } from './layout-gap';
import { VerticalStack } from './vertical-layout';

/** `{ type: 'Form' }`, at the base rank (doc 236 rule 39). */
export const formTester = rankWith(1, uiTypeIs('Form'));

/** A Form's title: its `label` when a non-blank string (rule 41), else `undefined`. */
export function formTitle(uischema: unknown): string | undefined {
  const label = (uischema as Record<string, unknown>)['label'];
  return typeof label === 'string' && label.trim() !== '' ? label.trim() : undefined;
}

/** A Form's description (doc 251 rule 1): rich content, or a legacy string. */
export type FormDescriptionValue = { rich: RichTextState } | { text: string };

/**
 * A Form's `options.description` (doc 251 rule 1): a usable rich state with text, or a non-blank legacy string
 * (trimmed); anything else is no description.
 */
export function formDescription(uischema: unknown): FormDescriptionValue | undefined {
  const options = (uischema as Record<string, unknown>)['options'];
  const raw =
    typeof options === 'object' && options !== null
      ? (options as Record<string, unknown>)['description']
      : undefined;
  const rich = richTextValue(raw);
  if (rich !== undefined) return richTextHasText(rich) ? { rich } : undefined;
  return typeof raw === 'string' && raw.trim() !== '' ? { text: raw.trim() } : undefined;
}

/** The description as an editor state — a legacy string as one paragraph (doc 251 rule 4). */
export function descriptionState(
  description: FormDescriptionValue | undefined,
): RichTextState | undefined {
  if (description === undefined) return undefined;
  return 'rich' in description ? description.rich : plainRichText(description.text);
}

/** The description under a Form's title (doc 251 rule 2), muted; legacy text renders as one paragraph. */
export function FormDescription({ value }: { value: FormDescriptionValue }) {
  return (
    <div data-slot="form-description" className="text-muted-foreground">
      <RichTextView value={descriptionState(value) ?? null} />
    </div>
  );
}

/** The title's heading (rule 41). The studio draws its own editable heading (rule 42b). */
export function FormTitle({ children }: { children: ReactNode }) {
  return (
    <Heading data-slot="form-title" level={1} size={1} className="font-semibold">
      {children}
    </Heading>
  );
}

/**
 * The title, then the description, ruled off from the page by ONE 2px BC Gov gold bottom border (doc 236 rule 41b,
 * doc 251 rule 2b) — the description sits above the line, with its title. Nothing when the Form has neither.
 */
export function FormHeader({
  title,
  description,
}: {
  title: string | undefined;
  description: FormDescriptionValue | undefined;
}) {
  if (title === undefined && description === undefined) return null;
  return (
    <header
      data-slot="form-header"
      className="flex flex-col gap-2 border-b-2 border-bcgov-gold pb-2"
    >
      {title !== undefined && <FormTitle>{title}</FormTitle>}
      {description !== undefined && <FormDescription value={description} />}
    </header>
  );
}

/** A Form: its header (title and description), then its elements laid out as a VerticalLayout (doc 236 rules 39-44). */
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
  const description = formDescription(uischema);
  return (
    <section
      data-slot="form"
      {...(title !== undefined && { 'aria-label': title })}
      className="flex flex-col gap-6"
    >
      <FormHeader title={title} description={description} />
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
