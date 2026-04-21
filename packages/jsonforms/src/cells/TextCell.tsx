import type { CellProps } from "@jsonforms/core";
import { isStringControl, rankWith } from "@jsonforms/core";
import { withJsonFormsCellProps } from "@jsonforms/react";
import { Input } from "@repo/ui";

function TextCellRenderer({ data, handleChange, path, enabled }: CellProps) {
  return (
    <Input
      value={data ?? ""}
      onChange={(e) => handleChange(path, e.target.value || undefined)}
      disabled={!enabled}
    />
  );
}

export const textCellTester = rankWith(1, isStringControl);
export const TextCell = withJsonFormsCellProps(TextCellRenderer);
export const textCellEntry = { tester: textCellTester, cell: TextCell };
