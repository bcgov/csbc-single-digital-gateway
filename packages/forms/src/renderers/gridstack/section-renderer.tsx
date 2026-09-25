import type { OwnPropsOfRenderer, UISchemaElement } from '@jsonforms/core';
import { Heading } from '@repo/ui/heading';
import { RichTextView } from '@repo/ui/rich-text-view';
import { useContext, type ComponentType } from 'react';
import { richTextValue } from '../ui/rich-text-value';
import { labelOf } from './element-label';
import { GAP_CLASS, layoutGapOf } from './layout-gap';
import { useLayoutVisible } from './form-renderer';
import { SectionDepthContext } from './section-depth-context';
import { INSET_CLASS, sectionHeadingLevel, sectionInset, sectionVariant } from './section-options';

// The `Section` renderer (doc 212 rules 1-3, 8-17): a heading, a rich description, and a vertical layout of the
// children — with an optional box drawn round the lot.
//
// Built the way `createFormRenderer` is, and for the same reason: the studio and fillable forms draw the SAME
// element with DIFFERENT vertical layout renderers (gridstack there, a CSS column here), so the layout arrives as
// a parameter and there is no second column implementation to drift from the first.
//
// What it does NOT copy from the Form: the nested check (a Section nests — that is the point), the gold rule, the
// `px-12` element inset, and any identity in a Flow. A Section is a division inside a page, not a page.

/** Rule 8: the class a host stylesheet can reach (user request). The slot is what tests and the studio use. */
export const SECTION_HEADING_CLASS = 'section-heading';

/**
 * Rule 14: the box `variant: 'container'` draws — around the CHILDREN ONLY (user, 2026-09-21), never around the
 * heading and description.
 *
 * The heading names the box; it does not sit in it. Putting the title inside would make the panel read as a
 * captioned card floating in the page, where what an author wants is a headed section whose CONTENT is grouped —
 * and it would indent the heading away from the headings of its sibling sections by the inset.
 *
 * The inset is separate from this, because it is authored (rule 15).
 */
const CONTAINER_CLASS = 'rounded-md border border-border bg-gray-20';

interface SectionTitleProps {
  readonly uischema: UISchemaElement;
  /** Rule 9: how many Sections enclose this one — `0` at the top, where the heading is `h2`. */
  readonly depth: number;
}

/**
 * Rules 8-11: the heading and the description.
 *
 * ONE component for both the studio and fillable forms, unlike a Form's title (doc 201 rules 7-8), which needs two
 * because it carries chrome in one and a placeholder in the other. A Section's heading is authored CONTENT that
 * reads the same in both places — and an untitled Section is a legitimate grouping box (rule 8), so there is no
 * empty state to placeholder.
 *
 * Rule 11: the size class sits on the heading itself. `@repo/ui` base styles size bare `h1`-`h6`
 * (`packages/ui/src/styles/base.css`, `@layer base`), so a size utility on any ancestor never reaches it.
 */
export function SectionTitle({ uischema, depth }: SectionTitleProps) {
  const title = labelOf(uischema, '');
  // Rule 3: the same guard a Form's description takes (doc 207 rule 4) — a malformed object crashes Lexical, and
  // the code panel can author one.
  const description = richTextValue(uischema.options?.['description']);
  if (title === '' && description === undefined) return null;

  const level = sectionHeadingLevel(depth);
  return (
    <div data-slot="section-title" className="flex flex-col gap-1">
      {title === '' ? null : (
        <Heading
          level={level}
          // Rule 9: the visual scale follows the semantic level, so a nested Section reads as subordinate rather
          // than merely being marked up that way.
          size={level}
          data-slot="section-heading"
          className={SECTION_HEADING_CLASS}
        >
          {title}
        </Heading>
      )}
      {description === undefined ? null : (
        <div data-slot="section-description" className="text-muted-foreground">
          <RichTextView value={description} />
        </div>
      )}
    </div>
  );
}

/**
 * Rules 1-2: the Section around whichever vertical layout renderer is in play.
 *
 * Rule 12: a `rule` that hides the Section hides its title too. The layout renderer works `visible` out for
 * itself and returns null; the title is its SIBLING, so it asks the same question the same way — through the
 * shared `useLayoutVisible`, which is exactly what `withJsonFormsLayoutProps` maps the layout's props with.
 *
 * Rule 10: the depth context is raised for the children, so a Section inside this one knows it is one deeper —
 * however many plain layouts sit in between.
 */
export function createSectionRenderer<P extends OwnPropsOfRenderer>(
  VerticalLayout: ComponentType<P>,
): ComponentType<P> {
  function SectionRenderer(props: P) {
    const depth = useContext(SectionDepthContext);
    const visible = useLayoutVisible(props);
    const options = props.uischema?.options;
    const variant = sectionVariant(options);
    // Rule 16: `inset` is read ONLY by a container. A plain Section has no box to pad, and padding it would
    // indent its children out of line with their siblings; an authored inset stays in the document, ignored —
    // the treatment doc 198 gives an inert `Stage.options.position`.
    const body = <VerticalLayout {...props} />;

    return (
      <SectionDepthContext.Provider value={depth + 1}>
        {/*
          NO `data-layout-type` here. The LAYOUT is the vertical renderer inside, which stamps the Section's type
          on itself already (`fill-layouts`' `FillStack` reads `uischema.type`) — claiming it on the wrapper too
          would give one element two nodes answering to the same query, and the gap assertions would read the
          wrapper's spacing as the layout's.

          Rule 2b: the space under the heading is the SAME authored gap that separates the children, so one
          setting makes a Section internally consistent rather than tight inside and loose at the top.
        */}
        <div
          data-slot="section"
          data-variant={variant}
          className={`flex flex-col ${GAP_CLASS[layoutGapOf(options)]}`}
        >
          {visible && props.uischema ? (
            <SectionTitle uischema={props.uischema} depth={depth} />
          ) : null}
          {/* Rule 14: the box goes round the CHILDREN. A plain Section adds no element at all rather than an
              unstyled wrapper, so its children sit exactly where a VerticalLayout's would. */}
          {variant === 'container' ? (
            <div
              data-slot="section-body"
              className={`${CONTAINER_CLASS} ${INSET_CLASS[sectionInset(options)]}`}
            >
              {body}
            </div>
          ) : (
            body
          )}
        </div>
      </SectionDepthContext.Provider>
    );
  }
  SectionRenderer.displayName = 'SectionRenderer';
  return SectionRenderer;
}
