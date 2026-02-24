import {
  AccordionContent,
  AccordionGroup,
  AccordionItem,
  AccordionTrigger,
  Checkbox,
  Input,
  Label,
} from "@repo/ui";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { documentTypesQueryOptions } from "../data/document-types.query";

interface ConsentHistoryFiltersProps {
  documentType?: string[];
  status?: string[];
  from?: string;
  to?: string;
}

export function ConsentHistoryFilters({
  documentType = [],
  status = [],
  from = "",
  to = "",
}: ConsentHistoryFiltersProps) {
  const navigate = useNavigate({ from: "/app/settings/consent-history" });
  const { data: documentTypes = [] } = useQuery(documentTypesQueryOptions());

  const toggleDocumentType = (id: string) => {
    const next = documentType.includes(id)
      ? documentType.filter((t) => t !== id)
      : [...documentType, id];
    navigate({
      search: (prev) => ({
        ...prev,
        documentType: next.length > 0 ? next : undefined,
        page: undefined,
      }),
      replace: true,
    });
  };

  const toggleStatus = (value: string) => {
    const next = status.includes(value)
      ? status.filter((s) => s !== value)
      : [...status, value];
    navigate({
      search: (prev) => ({
        ...prev,
        status: next.length > 0 ? next : undefined,
        page: undefined,
      }),
      replace: true,
    });
  };

  const updateDate = (field: "from" | "to", value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        [field]: value || undefined,
        page: undefined,
      }),
      replace: true,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <AccordionGroup
        title="Filters"
        values={["consent-type", "status", "date"]}
      >
        <AccordionItem value="consent-type">
          <AccordionTrigger>Consent type</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-2">
              {documentTypes.map((dt) => (
                <div key={dt.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`dt-${dt.id}`}
                    checked={documentType.includes(dt.id)}
                    onCheckedChange={() => toggleDocumentType(dt.id)}
                  />
                  <Label
                    htmlFor={`dt-${dt.id}`}
                    className="font-normal cursor-pointer"
                  >
                    {dt.name}
                  </Label>
                </div>
              ))}
              {documentTypes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No document types available.
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="status">
          <AccordionTrigger>Status</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="status-granted"
                  checked={status.includes("granted")}
                  onCheckedChange={() => toggleStatus("granted")}
                />
                <Label
                  htmlFor="status-granted"
                  className="font-normal cursor-pointer"
                >
                  Granted
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="status-revoked"
                  checked={status.includes("revoked")}
                  onCheckedChange={() => toggleStatus("revoked")}
                />
                <Label
                  htmlFor="status-revoked"
                  className="font-normal cursor-pointer"
                >
                  Revoked
                </Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="date">
          <AccordionTrigger>Date</AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="date-from" className="text-sm">
                  From
                </Label>
                <Input
                  id="date-from"
                  type="date"
                  value={from}
                  onChange={(e) => updateDate("from", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="date-to" className="text-sm">
                  To
                </Label>
                <Input
                  id="date-to"
                  type="date"
                  value={to}
                  onChange={(e) => updateDate("to", e.target.value)}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </AccordionGroup>
    </div>
  );
}
