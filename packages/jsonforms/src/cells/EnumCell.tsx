import type { EnumCellProps } from "@jsonforms/core";
import { isEnumControl, rankWith } from "@jsonforms/core";
import { withJsonFormsEnumCellProps } from "@jsonforms/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";

function EnumCellRenderer({
  data,
  handleChange,
  path,
  enabled,
  options,
}: EnumCellProps) {
  return (
    <Select
      value={data ?? ""}
      onValueChange={(val) => handleChange(path, val || undefined)}
      disabled={!enabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        {options?.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const enumCellTester = rankWith(1, isEnumControl);
export const EnumCell = withJsonFormsEnumCellProps(EnumCellRenderer);
export const enumCellEntry = { tester: enumCellTester, cell: EnumCell };
