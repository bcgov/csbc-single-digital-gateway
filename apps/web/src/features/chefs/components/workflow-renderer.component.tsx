import type { ServiceApplicationWorkflowDto } from "src/features/services/service.dto";

interface WorkflowRendererProps {
  workflow: ServiceApplicationWorkflowDto;
  onSubmissionComplete?: () => void;
  onSubmissionError?: (error: { message: string }) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function WorkflowRenderer(_props: WorkflowRendererProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-12 text-center">
      <h2 className="text-lg font-semibold">Workflow</h2>
      <p className="text-muted-foreground">
        Workflow applications are not yet supported. Please check back later.
      </p>
    </div>
  );
}
