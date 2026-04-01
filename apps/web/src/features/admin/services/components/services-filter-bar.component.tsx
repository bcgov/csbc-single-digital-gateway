import { Input, Label } from "@repo/ui";

interface ServicesFilterBarProps {
  orgUnitId: string;
  onOrgUnitIdChange: (value: string) => void;
}

export function ServicesFilterBar({
  orgUnitId,
  onOrgUnitIdChange,
}: ServicesFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-1">
        <Label className="text-sm">Org Unit ID</Label>
        <Input
          value={orgUnitId}
          onChange={(e) => onOrgUnitIdChange(e.target.value)}
          placeholder="Filter by org unit…"
          className="w-64"
        />
      </div>
    </div>
  );
}
