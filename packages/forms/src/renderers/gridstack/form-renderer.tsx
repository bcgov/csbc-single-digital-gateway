import type { OwnPropsOfRenderer, UISchemaElement } from '@jsonforms/core';
import { ctxToLayoutProps, useJsonForms } from '@jsonforms/react';
import { Heading } from '@repo/ui/heading';
import { useContext, type ComponentType, type CSSProperties } from 'react';
import { labelOf } from './element-label';
import { FORM_DROP_ZONE_SLOT } from './grid-drop-target';
import { GAP_REM, layoutGapOf } from './layout-gap';
import { LayoutNestingContext } from './layout-nesting';

/**
 * Doc 192 rule 5, doc 195 rule 16: what a Form shows in place of its elements inside a layout. A Form in a Stage is
 * listed on the Stage's card, never rendered inside a layout, so it never sees this.
 */
export const NESTED_FORM_MESSAGE = 'A Form can only be the root element or sit in a Stage.';

/** Doc 201 rule 11: what the studio canvas shows in place of an unwritten title. A placeholder only — never authored. */
export const FORM_TITLE_PLACEHOLDER = 'Untitled form';

/** Doc 201 rule 22: the same, for an unwritten description. Never authored, and never shown to a citizen. */
export const FORM_DESCRIPTION_PLACEHOLDER = 'Add a description...';

/**
 * Doc 201 rule 2: a title component is given the Form's element and reads `uischema.label` itself. JSONForms'
 * `withJsonFormsLayoutProps` supplies no translated label to a layout, so there is no `label` prop to read.
 */
interface FormTitleProps {
  readonly uischema: UISchemaElement;
}

/**
 * Doc 201 rule 9: the title is a sibling of the layout element, outside its gap flow — so a Form's `options.gap` still
 * spaces only its children and the title owns the space below itself.
 */
const TITLE_SPACING = 'mb-6';

/** Doc 201 rule 20: a Form's authored `options.description`, or `''` when absent or not a string. */
export function formDescriptionOf(uischema: UISchemaElement): string {
  const description = (uischema.options as { description?: unknown } | undefined)?.description;
  return typeof description === 'string' ? description.trim() : '';
}

/**
 * Doc 201 rule 7b: the studio title and description are inset exactly as far as an element's content, so the text
 * lines up with the fields below. A studio grid item's content sits `gap / 2` (its gridstack margin) + 1px (the
 * frame's border) + 0.5rem (the frame's `p-2`) inside the grid's edge — measured in the browser, 17px at the default
 * `md` gap. The gap is authored per Form, so this is an inline style, not a class.
 */
function studioInset(uischema: UISchemaElement): CSSProperties {
  const half = GAP_REM[layoutGapOf(uischema.options)] / 2;
  return { paddingInline: `calc(${half}rem + 1px + 0.5rem)` };
}

/**
 * Doc 201 rule 7: the studio canvas title — the heading alone, no rule and no chrome. Rule 7b: styled like the
 * studio's disabled fields, and inset to line up with the elements. Rule 11: an empty title draws a muted placeholder
 * instead, so an untitled Form still shows the author where its title goes. Rule 20: the description sits under it
 * with the same inset and grey; rule 22: unwritten, it shows a placeholder of its own.
 */
export function StudioFormTitle({ uischema }: FormTitleProps) {
  const title = labelOf(uischema, '');
  const description = formDescriptionOf(uischema);
  return (
    // Rule 7b: `opacity-50`, the same treatment the studio's disabled fields get (`@repo/ui` Field/Label), so the
    // title and description read as part of the non-interactive canvas rather than as a greyed colour. `select-none`
    // for the same reason: a disabled field's Label can't be text-selected either (user request 2026-09-17).
    <div
      data-slot="form-title-block"
      className={`${TITLE_SPACING} opacity-50 select-none`}
      style={studioInset(uischema)}
    >
      {title === '' ? (
        <Heading
          level={1}
          size={1}
          data-slot="form-title-placeholder"
          className="text-muted-foreground"
        >
          {FORM_TITLE_PLACEHOLDER}
        </Heading>
      ) : (
        <Heading level={1} size={1} data-slot="form-title">
          {title}
        </Heading>
      )}
      {/* Rule 22: an unwritten description shows its own placeholder, exactly as the title does (rule 11), so the
          author can see where it goes. Fillable forms still render nothing (rule 20b). */}
      {description === '' ? (
        <p data-slot="form-description-placeholder" className="mt-2 text-muted-foreground">
          {FORM_DESCRIPTION_PLACEHOLDER}
        </p>
      ) : (
        <p data-slot="form-description" className="mt-2 text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

/**
 * Doc 201 rule 8b: what the fillable title's TEXT is inset by. It lives on the heading, never on the bar around it —
 * that split is the whole point. The gold rule must span the form's full width (rule 8), so the element carrying
 * `border-b-2` takes no padding at all; putting `p-*` or `px-*` there would inset the rule along with the text.
 */
const TITLE_TEXT_PADDING = 'p-6';

/**
 * Doc 201 rule 8: the fillable title — the same heading under a full-width thick bcgov-gold rule. Rule 10: an empty
 * title renders nothing at all, since a citizen has no placeholder to fill in. Rule 20b: the Form's description sits
 * under the heading, inside the bar and above the rule, in muted text.
 *
 * Two elements, not one (rule 8b): the bar owns the rule and the space below it and stretches edge to edge, while the
 * heading inside owns the inset, so the title no longer sits at top 0 / left 0 / right 0 and the rule still runs the
 * full width.
 */
export function FillFormTitle({ uischema }: FormTitleProps) {
  const title = labelOf(uischema, '');
  const description = formDescriptionOf(uischema);
  if (title === '' && description === '') return null;
  return (
    <div data-slot="form-title-bar" className={`${TITLE_SPACING} border-b-2 border-bcgov-gold`}>
      {title === '' ? null : (
        <Heading
          level={1}
          size={1}
          data-slot="form-title"
          // Doc 201 rule 20b: with a description below, the heading gives up its bottom padding to it, so the pair
          // keeps the same p-6 frame inside the bar that the title alone has.
          className={description === '' ? TITLE_TEXT_PADDING : 'px-6 pt-6 pb-2'}
        >
          {title}
        </Heading>
      )}
      {description === '' ? null : (
        <p
          data-slot="form-description"
          className={`px-6 pb-6 text-muted-foreground${title === '' ? ' pt-6' : ''}`}
        >
          {description}
        </p>
      )}
    </div>
  );
}

/**
 * Doc 201 rule 5: a `rule` that hides the Form hides its title too. The layout renderer computes `visible` for itself
 * and returns null; the title is its sibling, so it asks the same question the same way — `ctxToLayoutProps` is exactly
 * what `withJsonFormsLayoutProps` maps the layout's props with, so the two can never disagree.
 */
function useFormVisible({ uischema, schema, path }: OwnPropsOfRenderer): boolean {
  const ctx = useJsonForms();
  if (uischema === undefined || ctx.core === undefined) return false;
  return ctxToLayoutProps(ctx, {
    uischema,
    // `exactOptionalPropertyTypes`: an absent own prop must stay absent, never an explicit `undefined`.
    ...(schema === undefined ? {} : { schema }),
    ...(path === undefined ? {} : { path }),
  }).visible;
}

/**
 * The `Form` renderer (doc 192 rules 4-5, amended by doc 201 rules 3-4): a generic, identifiable wrapper around a
 * vertical layout renderer — the gridstack one in the studio, the CSS column in fillable forms (doc 193). At the root it
 * renders the Form's title followed by that layout — still no `<form>` element (rule 4), but no longer DOM-identical to
 * a VerticalLayout (amending doc 192 rule 1), and `label` is the first authored key a Form reads. `Title` is the whole
 * point of the parameter: the studio passes `StudioFormTitle`, fillable forms `FillFormTitle` (rules 7-8).
 *
 * Every layout renderer provides `LayoutNestingContext` to its children, so finding a layout kind there means this Form
 * is nested; testers cannot see an element's depth, so root-only is enforced here. That error path renders no title.
 */
export function createFormRenderer<P extends OwnPropsOfRenderer>(
  VerticalLayout: ComponentType<P>,
  Title: ComponentType<FormTitleProps>,
  /** Doc 201 rule 21: wrap the title and layout in one drop zone (the studio). Fillable forms add no element. */
  dropZone = false,
): ComponentType<P> {
  function FormRenderer(props: P) {
    const nested = useContext(LayoutNestingContext) !== null;
    const visible = useFormVisible(props);
    if (nested) {
      return (
        <p role="alert" data-slot="form-nested-error" className="text-sm text-destructive">
          {NESTED_FORM_MESSAGE}
        </p>
      );
    }
    // Doc 201 rule 3: the title first, then the layout unchanged.
    const content = (
      <>
        {visible && props.uischema ? <Title uischema={props.uischema} /> : null}
        <VerticalLayout {...props} />
      </>
    );
    // Doc 201 rule 21: the grid inside retargets its drop listeners onto this element (`dropTargetFor`).
    return dropZone ? <div data-slot={FORM_DROP_ZONE_SLOT}>{content}</div> : content;
  }
  FormRenderer.displayName = 'FormRenderer';
  return FormRenderer;
}
