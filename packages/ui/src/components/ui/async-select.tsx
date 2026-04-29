import { useCallback, useEffect, useState } from "react";
import { AsyncPaginate, type LoadOptions } from "react-select-async-paginate";
import type { CSSObjectWithLabel, GroupBase, StylesConfig } from "react-select";

import { cn } from "@/lib/utils";

export interface AsyncSelectOption {
  value: string;
  label: string;
}

type InternalLoadOptions = LoadOptions<
  AsyncSelectOption,
  GroupBase<AsyncSelectOption>,
  { page: number }
>;

export interface AsyncSelectProps {
  value: string | string[] | undefined;
  onChange: (value: string | string[] | undefined) => void;
  loadOptions: InternalLoadOptions;
  resolveValue?: (value: string | string[]) => Promise<AsyncSelectOption[]>;
  isMulti?: boolean;
  placeholder?: string;
  isDisabled?: boolean;
  isClearable?: boolean;
  className?: string;
}

// Strip visual properties (colors, borders, backgrounds, shadows, fonts)
// but keep all layout/positioning properties intact.
const visualProps = new Set([
  "color",
  "backgroundColor",
  "background",
  "borderColor",
  "borderWidth",
  "borderStyle",
  "borderRadius",
  "border",
  "borderTop",
  "borderRight",
  "borderBottom",
  "borderLeft",
  "boxShadow",
  "outline",
  "outlineColor",
  "outlineOffset",
  "outlineStyle",
  "outlineWidth",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textTransform",
  "textDecoration",
  "WebkitTapHighlightColor",
]);

function stripVisual(base: CSSObjectWithLabel): CSSObjectWithLabel {
  const result: CSSObjectWithLabel = {};
  for (const [key, val] of Object.entries(base)) {
    if (!visualProps.has(key)) {
      result[key] = val;
    }
  }
  return result;
}

const layoutOnly: StylesConfig<AsyncSelectOption, boolean, GroupBase<AsyncSelectOption>> = {
  clearIndicator: (base) => stripVisual(base),
  container: (base) => stripVisual(base),
  control: (base) => stripVisual(base),
  dropdownIndicator: (base) => stripVisual(base),
  group: (base) => stripVisual(base),
  groupHeading: (base) => stripVisual(base),
  indicatorsContainer: (base) => stripVisual(base),
  indicatorSeparator: (base) => stripVisual(base),
  input: (base) => stripVisual(base),
  loadingIndicator: (base) => stripVisual(base),
  loadingMessage: (base) => stripVisual(base),
  menu: (base) => stripVisual(base),
  menuList: (base) => stripVisual(base),
  menuPortal: (base) => stripVisual(base),
  multiValue: (base) => stripVisual(base),
  multiValueLabel: (base) => stripVisual(base),
  multiValueRemove: (base) => stripVisual(base),
  noOptionsMessage: (base) => stripVisual(base),
  option: (base) => stripVisual(base),
  placeholder: (base) => stripVisual(base),
  singleValue: (base) => stripVisual(base),
  valueContainer: (base) => stripVisual(base),
};

export function AsyncSelect({
  value,
  onChange,
  loadOptions,
  resolveValue,
  isMulti = false,
  placeholder = "Select...",
  isDisabled = false,
  isClearable = true,
  className,
}: AsyncSelectProps) {
  const [selectedOptions, setSelectedOptions] = useState<AsyncSelectOption[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      setSelectedOptions([]);
      return;
    }

    if (!resolveValue) {
      const vals = Array.isArray(value) ? value : [value];
      setSelectedOptions(vals.map((v) => ({ value: v, label: v })));
      return;
    }

    setIsResolving(true);
    resolveValue(value).then((resolved) => {
      setSelectedOptions(resolved);
      setIsResolving(false);
    });
  }, [value, resolveValue]);

  const handleChange = useCallback(
    (newValue: unknown) => {
      if (isMulti) {
        const options = (newValue as AsyncSelectOption[] | null) ?? [];
        setSelectedOptions(options);
        onChange(options.map((o) => o.value));
      } else {
        const option = newValue as AsyncSelectOption | null;
        setSelectedOptions(option ? [option] : []);
        onChange(option?.value);
      }
    },
    [isMulti, onChange],
  );

  const selectValue = isMulti
    ? selectedOptions
    : selectedOptions[0] ?? null;

  return (
    <div data-slot="async-select" className={cn("w-full", className)}>
      <AsyncPaginate
        value={selectValue}
        loadOptions={loadOptions}
        onChange={handleChange}
        additional={{ page: 1 }}
        isMulti={isMulti}
        placeholder={placeholder}
        isDisabled={isDisabled || isResolving}
        isClearable={isClearable}
        isLoading={isResolving}
        maxMenuHeight={200}
        debounceTimeout={300}
        shouldLoadMore={(scrollHeight, clientHeight, scrollTop) =>
          scrollHeight - clientHeight - scrollTop < 50
        }
        styles={layoutOnly}
        classNames={{
          control: ({ isFocused, isDisabled: disabled }) =>
            cn(
              "dark:bg-input/30 border-input !h-9 rounded-md border bg-transparent px-2.5 text-base shadow-xs transition-[color,box-shadow] md:text-sm",
              isFocused && "border-ring ring-ring/50 ring-[3px]",
              disabled && "pointer-events-none cursor-not-allowed opacity-50",
            ),
          valueContainer: () => "gap-1",
          placeholder: () => "text-muted-foreground",
          input: () => "text-foreground",
          singleValue: () => "text-foreground",
          multiValue: () =>
            "bg-secondary text-secondary-foreground rounded-sm px-1.5 py-0.5 text-xs",
          multiValueLabel: () => "",
          multiValueRemove: () =>
            "ml-1 hover:text-destructive cursor-pointer",
          indicatorsContainer: () => "gap-1",
          clearIndicator: () =>
            "text-muted-foreground hover:text-foreground cursor-pointer p-0",
          dropdownIndicator: () =>
            "text-muted-foreground hover:text-foreground cursor-pointer p-0",
          indicatorSeparator: () => "bg-input self-stretch w-px my-1",
          menu: () =>
            "bg-popover text-popover-foreground border-input mt-1 rounded-md border shadow-md z-50",
          menuList: () => "py-1",
          option: ({ isFocused, isSelected }) =>
            cn(
              "cursor-pointer px-2.5 py-1.5 text-sm",
              isFocused && "bg-accent text-accent-foreground",
              isSelected && "font-medium",
            ),
          noOptionsMessage: () =>
            "text-muted-foreground px-2.5 py-4 text-center text-sm",
          loadingMessage: () =>
            "text-muted-foreground px-2.5 py-4 text-center text-sm",
          loadingIndicator: () => "text-muted-foreground",
        }}
      />
    </div>
  );
}
