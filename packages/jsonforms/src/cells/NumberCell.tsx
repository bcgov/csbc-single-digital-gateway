import type { CellProps } from "@jsonforms/core";
import { isNumberControl, rankWith } from "@jsonforms/core";
import { withJsonFormsCellProps } from "@jsonforms/react";
import { Input } from "@repo/ui";

function NumberCellRenderer({
  data,
  handleChange,
  path,
  enabled,
}: CellProps) {
  return (
    <Input
      type="number"
      step="any"
      value={data ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        handleChange(path, val === "" ? undefined : Number(val));
      }}
      disabled={!enabled}
    />
  );
}

export const numberCellTester = rankWith(1, isNumberControl);
export const NumberCell = withJsonFormsCellProps(NumberCellRenderer);
export const numberCellEntry = { tester: numberCellTester, cell: NumberCell };
