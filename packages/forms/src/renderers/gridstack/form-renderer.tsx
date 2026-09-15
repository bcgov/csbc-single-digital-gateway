import type { OwnPropsOfRenderer } from '@jsonforms/core';
import { useContext, type ComponentType } from 'react';
import { LayoutNestingContext } from './layout-nesting';

/**
 * Doc 192 rule 5, doc 195 rule 16: what a Form shows in place of its elements inside a layout. A Form in a Stage is
 * listed on the Stage's card, never rendered inside a layout, so it never sees this.
 */
export const NESTED_FORM_MESSAGE = 'A Form can only be the root element or sit in a Stage.';

/**
 * The `Form` renderer (doc 192 rules 4-5): a generic, identifiable wrapper around a vertical layout renderer — the
 * gridstack one in the studio, the CSS column in fillable forms (doc 193). At the root it renders a fragment around that
 * layout — no `<form>` and no DOM of its own — so it draws exactly like a VerticalLayout. Every layout renderer provides
 * `LayoutNestingContext` to its children, so finding a layout kind there means this Form is nested; testers cannot see an element's
 * depth, so root-only is enforced here.
 */
export function createFormRenderer<P extends OwnPropsOfRenderer>(
  VerticalLayout: ComponentType<P>,
): ComponentType<P> {
  function FormRenderer(props: P) {
    const nested = useContext(LayoutNestingContext) !== null;
    if (nested) {
      return (
        <p role="alert" data-slot="form-nested-error" className="text-sm text-destructive">
          {NESTED_FORM_MESSAGE}
        </p>
      );
    }
    return (
      // eslint-disable-next-line react/jsx-no-useless-fragment -- doc 192 rule 4: the Form is a fragment wrapper by design
      <>
        <VerticalLayout {...props} />
      </>
    );
  }
  FormRenderer.displayName = 'FormRenderer';
  return FormRenderer;
}
