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
 */
export function JsonForms({ renderers = defaultRenderers, cells = [], ...props }: JsonFormsProps) {
  return <JsonFormsBase renderers={renderers} cells={cells} {...props} />;
}
