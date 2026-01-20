export type ChefsScriptStatus = "idle" | "loading" | "ready" | "error";

export interface ChefsFormReadyEvent {
  formio: unknown;
}

export interface ChefsSubmissionCompleteEvent {
  submission: {
    id: string;
    data: Record<string, unknown>;
  };
}

export interface ChefsSubmissionErrorEvent {
  error: Error;
  message: string;
}

export interface ChefsFormViewerProps {
  formId: string;
  authToken?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  submissionId?: string;
  readOnly?: boolean;
  language?: string;
  isolateStyles?: boolean;
  baseUrl?: string;
  onFormReady?: (event: ChefsFormReadyEvent) => void;
  onSubmissionComplete?: (event: ChefsSubmissionCompleteEvent) => void;
  onSubmissionError?: (event: ChefsSubmissionErrorEvent) => void;
}
