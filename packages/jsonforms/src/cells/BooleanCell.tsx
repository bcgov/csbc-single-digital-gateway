import type { CellProps } from "@jsonforms/core";
import { isBooleanControl, rankWith } from "@jsonforms/core";
import { withJsonFormsCellProps } from "@jsonforms/react";
import { Checkbox } from "@repo/ui";

function BooleanCellRenderer({
  data,
  handleChange,
  path,
  enabled,
}: CellProps) {
  return (
    <Checkbox
      checked={!!data}
      onCheckedChange={(checked) => handleChange(path, checked)}
      disabled={!enabled}
    />
  );
}

export const booleanCellTester = rankWith(1, isBooleanControl);
export const BooleanCell = withJsonFormsCellProps(BooleanCellRenderer);
export const booleanCellEntry = {
  tester: booleanCellTester,
  cell: BooleanCell,
};
