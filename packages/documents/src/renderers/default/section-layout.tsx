import { rankWith, uiTypeIs, type Layout, type LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { Heading } from '@repo/ui/heading';
import { useContext, type ReactNode } from 'react';
import {
  INSET_CLASS,
  sectionDescription,
  sectionHeadingLevel,
  sectionInset,
  sectionTitle,
  sectionVariant,
} from '../ui/section-model';
import { GAP_CLASS, layoutGap } from './layout-gap';
import { SectionDepthContext } from './section-depth';
import { VerticalStack } from './vertical-layout';

/** `{ type: 'Section' }` at the base rank (doc 278 rule 2); the studio's outranks it. */
export const sectionLayoutTester = rankWith(1, uiTypeIs('Section'));

/** Rule 5: the class a host stylesheet can reach; the slot is what tests and the studio use. */
export const SECTION_HEADING_CLASS = 'section-heading';

/** Rule 10: the box a container draws round its BODY only — the heading names the box, it does not sit in it. */
const CONTAINER_CLASS = 'rounded-md border border-border bg-gray-20';

/** The description's look, shared with the studio's in-place editor. */
export const SECTION_DESCRIPTION_CLASS = 'whitespace-pre-line text-muted-foreground';

/**
 * A Section's frame (doc 278 rules 2b, 7, 9-11), shared by both renderers: a column spaced by the authored gap holding
 * the header and the body — the body boxed for a container — with the depth raised for everything inside.
 */
export function SectionFrame({
  options,
  header,
  children,
}: {
  options: unknown;
  header: ReactNode;
  children: ReactNode;
}) {
  const depth = useContext(SectionDepthContext);
  const variant = sectionVariant(options);
  return (
    <SectionDepthContext.Provider value={depth + 1}>
      <div
        data-slot="section"
        data-variant={variant}
        className={`flex flex-col ${GAP_CLASS[layoutGap(options)]}`}
      >
        {header}
        {variant === 'container' ? (
          <div
            data-slot="section-body"
            className={`${CONTAINER_CLASS} ${INSET_CLASS[sectionInset(options)]}`}
          >
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </SectionDepthContext.Provider>
  );
}

/** Rule 6: this Section's heading level, read OUTSIDE its own frame (which raises the depth for its children). */
export function useSectionHeadingLevel() {
  return sectionHeadingLevel(useContext(SectionDepthContext));
}

/** A Section filled in or read (doc 278 rules 1-11): the header only with a title or description, then its body. */
export function SectionLayout({ uischema, visible, ...props }: LayoutProps) {
  const level = useSectionHeadingLevel();
  if (!visible) return null;
  const title = sectionTitle(uischema);
  const description = sectionDescription(uischema);
  const header = (title !== undefined || description !== undefined) && (
    <div data-slot="section-title" className="flex flex-col gap-1">
      {title !== undefined && (
        <Heading
          level={level}
          size={level}
          data-slot="section-heading"
          className={SECTION_HEADING_CLASS}
        >
          {title}
        </Heading>
      )}
      {description !== undefined && (
        <p data-slot="section-description" className={SECTION_DESCRIPTION_CLASS}>
          {description}
        </p>
      )}
    </div>
  );
  return (
    <SectionFrame options={uischema.options} header={header}>
      <VerticalStack
        elements={(uischema as Layout).elements ?? []}
        gap={layoutGap(uischema.options)}
        schema={props.schema}
        path={props.path}
        enabled={props.enabled}
        renderers={props.renderers}
        cells={props.cells}
      />
    </SectionFrame>
  );
}

export const sectionLayoutEntry = {
  tester: sectionLayoutTester,
  renderer: withJsonFormsLayoutProps(SectionLayout),
};
