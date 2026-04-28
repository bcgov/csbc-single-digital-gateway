import type { EnrichedApplicationDto } from "../application.dto";
import { YourActivityRow } from "./your-activity-row.component";

interface YourActivityListProps {
  items: EnrichedApplicationDto[];
  serviceId: string;
}

export function YourActivityList({ items, serviceId }: YourActivityListProps) {
  return (
    <ul className="flex flex-col gap-px border bg-border list-none p-0 m-0">
      {items.map((application) => (
        <li key={application.id}>
          <YourActivityRow
            application={application}
            serviceId={serviceId}
          />
        </li>
      ))}
    </ul>
  );
}
