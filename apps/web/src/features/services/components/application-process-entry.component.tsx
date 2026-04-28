import { useQuery } from "@tanstack/react-query";
import { applicationProcessQueryOptions } from "../data/application-process.query";
import { ApplicationProcessSkeleton } from "./application-process-skeleton.component";

interface ApplicationProcessEntryProps {
  serviceId: string;
  versionId: string;
  applicationId: string;
  applicationLabel: string;
  locale?: string;
}

export function ApplicationProcessEntry({
  serviceId,
  versionId,
  applicationId,
  applicationLabel,
  locale,
}: ApplicationProcessEntryProps) {
  const { data, isPending, isError } = useQuery(
    applicationProcessQueryOptions({
      serviceId,
      versionId,
      applicationId,
      locale,
    }),
  );

  if (isError) {
    return null;
  }

  return (
    <article className="flex flex-col gap-4 border bg-white p-4">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{applicationLabel}</p>
        <h3 className="text-lg font-semibold">
          {isPending ? "Loading…" : data.name}
        </h3>
      </header>
      {isPending ? (
        <ApplicationProcessSkeleton />
      ) : data.steps.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Process details will appear here when available.
        </p>
      ) : (
        <ol className="flex flex-col gap-3 list-none p-0 m-0">
          {data.steps.map((step, index) => (
            <li key={step.id} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-medium"
              >
                {index + 1}
              </span>
              <div className="flex flex-col grow pt-0.5">
                <span className="font-medium">{step.label}</span>
                {step.description && (
                  <span className="text-sm text-muted-foreground">
                    {step.description}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}
