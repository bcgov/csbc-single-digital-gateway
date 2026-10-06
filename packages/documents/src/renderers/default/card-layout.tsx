import { rankWith, uiTypeIs, type LayoutProps, type UISchemaElement } from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@repo/ui/card';
import type { ReactNode } from 'react';
import {
  cardDescription,
  cardGap,
  cardSize,
  cardSlots,
  cardTitle,
  type CardSize,
} from '../ui/card-model';
import type { LayoutGap } from './layout-gap';

/** `{ type: 'Card' }` at the base rank (doc 273 rule 2); the studio's outranks it. */
export const cardLayoutTester = rankWith(1, uiTypeIs('Card'));

/**
 * The Card's spacing (doc 273 rule 4), restated under `data-[size=sm]:` — Card's own small gap is a data-attribute
 * variant, which would outrank a bare gap class. Literal classes, so Tailwind sees each one.
 */
const CARD_GAP_CLASS: Record<LayoutGap, string> = {
  sm: 'gap-2 data-[size=sm]:gap-2',
  md: 'gap-4 data-[size=sm]:gap-4',
  lg: 'gap-6 data-[size=sm]:gap-6',
};

/** The `@repo/ui` Card a Card element draws in: its size, and its spacing when one is set. */
export function CardFrame({
  element,
  className,
  children,
}: {
  element: unknown;
  className?: string;
  children: ReactNode;
}) {
  const gap = cardGap(element);
  const size: CardSize = cardSize(element);
  const classes = [gap === undefined ? undefined : CARD_GAP_CLASS[gap], className].filter(Boolean);
  return (
    <Card size={size} {...(classes.length > 0 && { className: classes.join(' ') })}>
      {children}
    </Card>
  );
}

/** One slot's VerticalLayout, dispatched — filling the slot's width (CardFooter is a flex row). */
export function SlotDispatch({
  layout,
  props,
}: {
  layout: Record<string, unknown>;
  props: Pick<LayoutProps, 'schema' | 'path' | 'enabled' | 'renderers' | 'cells'>;
}) {
  return (
    <div className="w-full">
      <JsonFormsDispatch
        uischema={layout as unknown as UISchemaElement}
        schema={props.schema}
        path={props.path}
        enabled={props.enabled}
        {...(props.renderers !== undefined && { renderers: props.renderers })}
        {...(props.cells !== undefined && { cells: props.cells })}
      />
    </div>
  );
}

/**
 * A Card filled in or read (doc 273 rules 2-4): a header only with a title or description, the content layout, and the
 * footer layout only when it holds an element.
 */
export function CardLayout({ uischema, visible, ...props }: LayoutProps) {
  if (!visible) return null;
  const title = cardTitle(uischema);
  const description = cardDescription(uischema);
  const { content, footer } = cardSlots(uischema);
  const footerElements = footer?.['elements'];
  return (
    <CardFrame element={uischema}>
      {(title !== undefined || description !== undefined) && (
        <CardHeader>
          {title !== undefined && <CardTitle>{title}</CardTitle>}
          {description !== undefined && (
            <CardDescription className="whitespace-pre-line">{description}</CardDescription>
          )}
        </CardHeader>
      )}
      {content !== undefined && (
        <CardContent>
          <SlotDispatch layout={content} props={props} />
        </CardContent>
      )}
      {footer !== undefined && Array.isArray(footerElements) && footerElements.length > 0 && (
        <CardFooter>
          <SlotDispatch layout={footer} props={props} />
        </CardFooter>
      )}
    </CardFrame>
  );
}

export const cardLayoutEntry = {
  tester: cardLayoutTester,
  renderer: withJsonFormsLayoutProps(CardLayout),
};
