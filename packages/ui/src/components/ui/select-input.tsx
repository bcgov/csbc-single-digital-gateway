import { useCallback, useMemo } from "react";
import ReactSelect, {
  type CSSObjectWithLabel,
  type GroupBase,
  type StylesConfig,
} from "react-select";

import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectInputProps {
  value: string | string[] | undefined;
  onChange: (value: string | string[] | undefined) => void;
  options: SelectOption[];
  isMulti?: boolean;
  placeholder?: string;
  isDisabled?: boolean;
  isClearable?: boolean;
  className?: string;
}

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
    if (!visualProps.has(key)) result[key] = val;
  }
  return result;
}

const layoutOnly: StylesConfig<SelectOption, boolean, GroupBase<SelectOption>> = {
  clearIndicator: (base) => stripVisual(base),
  container: (base) => stripVisual(base),
  control: (base) => stripVisual(base),
  dropdownIndicator: (base) => stripVisual(base),
  group: (base) => stripVisual(base),
  groupHeading: (base) => stripVisual(base),
  indicatorsContainer: (base) => stripVisual(base),
  indicatorSeparator: (base) => stripVisual(base),
  input: (base) => stripVisual(base),
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

export function SelectInput({
  value,
  onChange,
  options,
  isMulti = false,
  placeholder = "Select...",
  isDisabled = false,
  isClearable = true,
  className,
}: SelectInputProps) {
  const selectValue = useMemo(() => {
    if (value === undefined || value === null) return isMulti ? [] : null;
    if (isMulti) {
      const vals = Array.isArray(value) ? value : [value];
      return vals
        .map((v) => options.find((o) => o.value === v))
        .filter((o): o is SelectOption => Boolean(o));
    }
    return options.find((o) => o.value === value) ?? null;
  }, [value, options, isMulti]);

  const handleChange = useCallback(
    (newValue: unknown) => {
      if (isMulti) {
        const opts = (newValue as SelectOption[] | null) ?? [];
        onChange(opts.map((o) => o.value));
      } else {
        const opt = newValue as SelectOption | null;
        onChange(opt?.value);
      }
    },
    [isMulti, onChange],
  );

  return (
    <div data-slot="select-input" className={cn("w-full", className)}>
      <ReactSelect
        value={selectValue}
        options={options}
        onChange={handleChange}
        isMulti={isMulti}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isClearable={isClearable}
        maxMenuHeight={200}
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
          multiValueRemove: () => "ml-1 hover:text-destructive cursor-pointer",
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
        }}
      />
    </div>
  );
}
