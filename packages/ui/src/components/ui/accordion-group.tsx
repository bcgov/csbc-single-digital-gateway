import * as React from 'react';

import type { AccordionValue } from '@base-ui/react/accordion';
import { ChevronsDown, ChevronsUp } from 'lucide-react';

import { cn } from '@ui/lib/utils';
import { Accordion } from './accordion';

interface AccordionGroupProps extends Omit<
  React.ComponentProps<typeof Accordion>,
  'value' | 'onValueChange' | 'multiple'
> {
  title?: string;
  description?: string;
  /** All possible item values — required for expand/collapse all to work */
  values?: AccordionValue;
  defaultValue?: AccordionValue;
}

function AccordionGroup({
  title,
  description,
  values = [],
  defaultValue = [],
  className,
  children,
  ...props
}: AccordionGroupProps) {
  const [openValues, setOpenValues] = React.useState<AccordionValue>(defaultValue);

  const allExpanded = values.length > 0 && values.every((v) => openValues.includes(v));

  function toggleAll() {
    setOpenValues(allExpanded ? [] : [...values]);
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {(title || description || values.length > 0) && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            {title && <p className="text-h6 font-bold leading-none">{title}</p>}
            {description && <p className="text-sm">{description}</p>}
          </div>
          {values.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              aria-label={`${allExpanded ? 'Collapse' : 'Expand'} all sections in ${title}`}
              className="shrink-0 cursor-pointer hover:underline underline-offset-3 transition-colors flex flex-row gap-2 justify-center items-center"
            >
              {allExpanded ? <ChevronsUp size={20} /> : <ChevronsDown size={20} />}
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
          )}
        </div>
      )}
      <Accordion
        multiple
        value={openValues}
        onValueChange={setOpenValues}
        className="border"
        {...props}
      >
        {children}
      </Accordion>
    </div>
  );
}

export { AccordionGroup };
export type { AccordionGroupProps };
