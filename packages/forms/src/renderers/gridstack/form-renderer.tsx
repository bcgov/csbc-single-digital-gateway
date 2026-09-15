import type { OwnPropsOfRenderer } from '@jsonforms/core';
import { useContext, type ComponentType } from 'react';
import { GridContext } from './grid-context';

/** Doc 192 rule 5: what a Form shows in place of its elements anywhere but the root. */
export const NESTED_FORM_MESSAGE = 'A Form can only be the root element.';

/**
 * The `Form` renderer (doc 192 rules 4-5): a generic, identifiable wrapper around the vertical layout renderer. At the
 * root it renders a fragment around that layout — no `<form>` and no DOM of its own — so it draws exactly like a
 * VerticalLayout. Every gridstack layout provides a `GridContext` to its items, so finding one means this Form is
 * nested; testers cannot see an element's depth, so root-only is enforced here.
 */
export function createFormRenderer<P extends OwnPropsOfRenderer>(
  VerticalLayout: ComponentType<P>,
): ComponentType<P> {
  function FormRenderer(props: P) {
    const nested = useContext(GridContext) !== null;
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
