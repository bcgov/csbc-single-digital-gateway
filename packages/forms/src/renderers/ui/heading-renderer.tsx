import { rankWith, uiTypeIs, type LabelProps, type RankedTester } from '@jsonforms/core';
import { withJsonFormsLabelProps } from '@jsonforms/react';
import { Heading } from '@repo/ui/heading';
import { toHeadingLevel } from './heading-options';

export const headingTester: RankedTester = rankWith(1, uiTypeIs('Heading'));

/**
 * Renders `{ type: 'Heading', text, options: { level, size } }` with `@repo/ui`'s `Heading`.
 *
 * Mapped through `withJsonFormsLabelProps`, so `text` arrives i18n-translated and `visible` has the
 * element's `rule` applied — exactly as for a `Label`. Empty text renders nothing: an empty heading
 * element is an accessibility failure. `level`/`size` are spread only when valid because
 * `exactOptionalPropertyTypes` forbids passing `undefined` to `Heading`'s optional props.
 */
function HeadingRenderer({ text, visible, uischema }: LabelProps) {
  if (!visible || !text?.trim()) return null;

  const level = toHeadingLevel(uischema.options?.level);
  const size = toHeadingLevel(uischema.options?.size);

  return (
    <Heading {...(level === undefined ? {} : { level })} {...(size === undefined ? {} : { size })}>
      {text}
    </Heading>
  );
}

export const HeadingDisplayRenderer = withJsonFormsLabelProps(HeadingRenderer);
