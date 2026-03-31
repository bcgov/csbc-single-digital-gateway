import { Input, Label } from "@repo/ui";

interface DocumentsFilterBarProps {
  orgUnitId: string;
  consentDocumentTypeId: string;
  onOrgUnitIdChange: (value: string) => void;
  onConsentDocumentTypeIdChange: (value: string) => void;
}

export function DocumentsFilterBar({
  orgUnitId,
  consentDocumentTypeId,
  onOrgUnitIdChange,
  onConsentDocumentTypeIdChange,
}: DocumentsFilterBarProps) {
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
      <div className="flex flex-col gap-1">
        <Label className="text-sm">Document Type ID</Label>
        <Input
          value={consentDocumentTypeId}
          onChange={(e) => onConsentDocumentTypeIdChange(e.target.value)}
          placeholder="Filter by type…"
          className="w-64"
        />
      </div>
    </div>
  );
}
