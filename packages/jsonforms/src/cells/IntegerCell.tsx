import type { CellProps } from "@jsonforms/core";
import { isIntegerControl, rankWith } from "@jsonforms/core";
import { withJsonFormsCellProps } from "@jsonforms/react";
import { Input } from "@repo/ui";

function IntegerCellRenderer({
  data,
  handleChange,
  path,
  enabled,
}: CellProps) {
  return (
    <Input
      type="number"
      step="1"
      value={data ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        handleChange(path, val === "" ? undefined : parseInt(val, 10));
      }}
      disabled={!enabled}
    />
  );
}

export const integerCellTester = rankWith(1, isIntegerControl);
export const IntegerCell = withJsonFormsCellProps(IntegerCellRenderer);
export const integerCellEntry = {
  tester: integerCellTester,
  cell: IntegerCell,
};
