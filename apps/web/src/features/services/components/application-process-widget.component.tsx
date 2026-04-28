import {
  isWorkflowApplication,
  type ServiceDto,
} from "../service.dto";
import { ApplicationProcessEntry } from "./application-process-entry.component";

interface ApplicationProcessWidgetProps {
  service: ServiceDto;
}

export function ApplicationProcessWidget({
  service,
}: ApplicationProcessWidgetProps) {
  const workflowEntries =
    service.content?.applications?.filter(isWorkflowApplication) ?? [];

  if (workflowEntries.length === 0) {
    return null;
  }

  if (!service.versionId) {
    return null;
  }

  const versionId = service.versionId;

  return (
    <div
      id="application-process"
      className="scroll-mt-20 flex flex-col gap-4 mb-4"
    >
      <h2 className="section-heading">Application process</h2>
      <p>Here&apos;s what to expect when you apply.</p>
      <div className="flex flex-col gap-4">
        {workflowEntries.map((entry) => (
          <ApplicationProcessEntry
            key={entry.id}
            serviceId={service.id}
            versionId={versionId}
            applicationId={entry.id}
            applicationLabel={entry.label}
          />
        ))}
      </div>
    </div>
  );
}
