import type { CellProps } from "@jsonforms/core";
import { isDateControl, rankWith } from "@jsonforms/core";
import { withJsonFormsCellProps } from "@jsonforms/react";
import { Input } from "@repo/ui";

function DateCellRenderer({ data, handleChange, path, enabled }: CellProps) {
  return (
    <Input
      type="date"
      value={data ?? ""}
      onChange={(e) => handleChange(path, e.target.value || undefined)}
      disabled={!enabled}
    />
  );
}

export const dateCellTester = rankWith(1, isDateControl);
export const DateCell = withJsonFormsCellProps(DateCellRenderer);
export const dateCellEntry = { tester: dateCellTester, cell: DateCell };
