import { rankWith, uiTypeIs, type LabelProps, type RankedTester } from '@jsonforms/core';
import { withJsonFormsLabelProps } from '@jsonforms/react';
import { Separator } from '@repo/ui/separator';
import { useContext } from 'react';
import { LayoutNestingContext } from '../gridstack/layout-nesting';

export const separatorTester: RankedTester = rankWith(1, uiTypeIs('Separator'));

/**
 * Renders `{ type: 'Separator' }` with `@repo/ui`'s Base UI `Separator` (doc 194 rules 1-3): a semantic horizontal
 * rule with no settings. Mapped through `withJsonFormsLabelProps` only for `visible`, which has the element's `rule`
 * applied. A Separator is not allowed in a HorizontalLayout — it would take a column — so there it renders nothing.
 */
function SeparatorRenderer({ visible }: LabelProps) {
  const parentKind = useContext(LayoutNestingContext);
  if (!visible || parentKind === 'horizontal') return null;
  return <Separator />;
}

export const SeparatorDisplayRenderer = withJsonFormsLabelProps(SeparatorRenderer);
