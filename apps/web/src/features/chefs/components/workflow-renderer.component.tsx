import type { ApplicationDto } from "../../services/service.dto";

interface WorkflowRendererProps {
  application: ApplicationDto;
  onSubmissionComplete?: () => void;
  onSubmissionError?: (error: { message: string }) => void;
}

export function WorkflowRenderer({ application }: WorkflowRendererProps) {
  console.log(">> application: ", application);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-12 text-center">
      <h2 className="text-lg font-semibold">{application.label}</h2>
      <p className="text-muted-foreground">
        Workflow applications are not yet supported. Please check back later.
      </p>
    </div>
  );
}
