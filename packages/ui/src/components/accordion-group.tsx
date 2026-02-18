"use client";

import * as React from "react";

import { Accordion } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { AccordionValue } from "@base-ui/react/accordion";
import { IconChevronsDown, IconChevronsUp } from "@tabler/icons-react";

interface AccordionGroupProps extends Omit<
  React.ComponentProps<typeof Accordion>,
  "value" | "onValueChange" | "multiple"
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
  const [openValues, setOpenValues] =
    React.useState<AccordionValue>(defaultValue);

  const allExpanded =
    values.length > 0 && values.every((v) => openValues.includes(v));

  function toggleAll() {
    setOpenValues(allExpanded ? [] : [...values]);
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {(title || description || values.length > 0) && (
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            {title && (
              <h3 className="text-lg font-semibold leading-none tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-muted-foreground text-sm">{description}</p>
            )}
          </div>
          {values.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer text-sm underline underline-offset-3 transition-colors flex flex-row gap-2 justify-center"
            >
              {allExpanded ? (
                <IconChevronsUp size="20" />
              ) : (
                <IconChevronsDown size="20" />
              )}
              {allExpanded ? "Collapse all" : "Expand all"}
            </button>
          )}
        </div>
      )}
      <Accordion
        multiple
        value={openValues}
        onValueChange={setOpenValues}
        className="border border-neutral-300"
        {...props}
      >
        {children}
      </Accordion>
    </div>
  );
}

export { AccordionGroup };
export type { AccordionGroupProps };
