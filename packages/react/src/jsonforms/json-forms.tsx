import { JsonForms as JsonFormsBase } from '@jsonforms/react';
import type { JsonFormsInitStateProps, JsonFormsReactProps } from '@jsonforms/react';
import { renderers as defaultRenderers } from '../jsonforms-renderers';

type BaseProps = JsonFormsInitStateProps & JsonFormsReactProps;

/**
 * Props of the @repo/react `JsonForms` wrapper. Identical to `@jsonforms/react`'s
 * `JsonForms` except `renderers` and `cells` are optional — they default to the
 * `@repo/ui` renderer set and `[]` respectively.
 */
export type JsonFormsProps = Omit<BaseProps, 'renderers' | 'cells'> & {
  renderers?: BaseProps['renderers'];
  cells?: BaseProps['cells'];
};

/**
 * Batteries-included JSONForms host: drop in a `schema` + `data` and it renders with the
 * design-system controls out of the box. Pass `renderers`/`cells` to override. All other
 * props (onChange, uischema, validationMode, readonly, i18n, config, …) pass straight
 * through to `@jsonforms/react`.
 *
 * The root schema's `title`/`description` render as a form header above the fields (when present),
 * so the form's name + intro show consistently wherever a form is rendered.
 */
export function JsonForms({ renderers = defaultRenderers, cells = [], ...props }: JsonFormsProps) {
  const title = typeof props.schema?.title === 'string' ? props.schema.title : undefined;
  const description =
    typeof props.schema?.description === 'string' ? props.schema.description : undefined;
  return (
    <div className="space-y-4">
      {title !== undefined || description !== undefined ? (
        <header className="space-y-1">
          {title !== undefined ? (
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          ) : null}
          {description !== undefined ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </header>
      ) : null}
      <JsonFormsBase renderers={renderers} cells={cells} {...props} />
    </div>
  );
}
