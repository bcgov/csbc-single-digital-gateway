import { Spinner } from "@repo/ui";
import { useEffect, useRef, useState } from "react";
import { useChefsScript } from "../hooks/use-chefs-script.hook";
import type { ChefsFormViewerProps } from "../types/chefs-form-viewer.types";

export function ChefsFormViewer({
  formId,
  authToken,
  apiKey,
  headers,
  submissionId,
  readOnly = false,
  language = "en",
  isolateStyles = false,
  baseUrl = "https://submit.digital.gov.bc.ca/app",
  onFormReady,
  onSubmissionComplete,
  onSubmissionError,
}: ChefsFormViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptStatus = useChefsScript();
  const [isFormMounted, setIsFormMounted] = useState(false);

  // Encode headers as URL-encoded JSON (as per PR-1802)
  const headersAttr = headers
    ? `headers="${encodeURIComponent(JSON.stringify(headers))}"`
    : "";

  // Build attributes string
  const attrs = [
    `form-id="${formId}"`,
    `base-url="${baseUrl}"`,
    authToken ? `auth-token="${authToken}"` : "",
    apiKey ? `api-key="${apiKey}"` : "",
    headersAttr,
    submissionId ? `submission-id="${submissionId}"` : "",
    readOnly ? `read-only="true"` : "",
    language ? `language="${language}"` : "",
    isolateStyles ? `isolate-styles="true"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Set innerHTML immediately when formId changes, before script loads
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = `<chefs-form-viewer ${attrs}></chefs-form-viewer>`;

    // Inject styles early via MutationObserver to prevent layout shift
    const formViewer = containerRef.current.querySelector("chefs-form-viewer");
    if (formViewer) {
      const injectStyles = (shadowRoot: ShadowRoot) => {
        if (shadowRoot.querySelector("#chefs-custom-styles")) return;
        const styleEl = document.createElement("style");
        styleEl.id = "chefs-custom-styles";
        styleEl.textContent = `
          *, *::before, *::after {
            transition: none !important;
            animation: none !important;
          }
          .v-container,
          .v-container.main {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        `;
        shadowRoot.prepend(styleEl);
      };

      // Check if shadowRoot already exists
      const existingShadowRoot = (formViewer as HTMLElement & { shadowRoot: ShadowRoot | null }).shadowRoot;
      if (existingShadowRoot) {
        injectStyles(existingShadowRoot);
      }

      // Watch for shadowRoot creation
      const observer = new MutationObserver(() => {
        const shadowRoot = (formViewer as HTMLElement & { shadowRoot: ShadowRoot | null }).shadowRoot;
        if (shadowRoot) {
          injectStyles(shadowRoot);
          observer.disconnect();
        }
      });
      observer.observe(formViewer, { childList: true, subtree: true });

      return () => observer.disconnect();
    }
  }, [attrs, formId, scriptStatus]);

  // Attach event listeners once script is ready
  useEffect(() => {
    if (scriptStatus !== "ready" || !containerRef.current) {
      return;
    }

    const formViewer = containerRef.current.querySelector("chefs-form-viewer");
    if (!formViewer) {
      return;
    }

    const handleFormReady = () => {
      setIsFormMounted(true);
      onFormReady?.({ formio: null });
    };

    const handleSubmit = (event: Event) => {
      const customEvent = event as CustomEvent;
      onSubmissionComplete?.(customEvent.detail);
    };

    const handleSubmitError = (event: Event) => {
      const customEvent = event as CustomEvent;
      onSubmissionError?.(customEvent.detail);
    };

    formViewer.addEventListener("formio:ready", handleFormReady);
    formViewer.addEventListener("formio:submit", handleSubmit);
    formViewer.addEventListener("formio:submitError", handleSubmitError);

    // Check if already rendered (in case we missed the ready event)
    const shadowRoot = (
      formViewer as HTMLElement & { shadowRoot: ShadowRoot | null }
    ).shadowRoot;
    if (shadowRoot && shadowRoot.children.length > 0) {
      // Defer setState to avoid synchronous update within effect
      queueMicrotask(() => setIsFormMounted(true));
    }

    // Set headers as property directly (required for evalContext)
    if (headers) {
      (formViewer as unknown as Record<string, unknown>).headers = headers;
    }

    // Call load() method explicitly
    const viewer = formViewer as HTMLElement & { load?: () => Promise<void> };
    if (typeof viewer.load === "function") {
      viewer.load().catch(() => {
        // Error handling is done via formio:submitError event
      });
    }

    return () => {
      formViewer.removeEventListener("formio:ready", handleFormReady);
      formViewer.removeEventListener("formio:submit", handleSubmit);
      formViewer.removeEventListener("formio:submitError", handleSubmitError);
    };
  }, [scriptStatus, headers, onFormReady, onSubmissionComplete, onSubmissionError]);

  if (scriptStatus === "error") {
    return (
      <div className="flex items-center justify-center p-8 text-destructive">
        <p>Failed to load form. Please try refreshing the page.</p>
      </div>
    );
  }

  const isScriptLoading = scriptStatus === "loading" || scriptStatus === "idle";
  const showSpinner = isScriptLoading || !isFormMounted;

  return (
    <div className="relative">
      {showSpinner && (
        <div className="flex items-center justify-center p-8">
          <Spinner className="size-8" />
          <span className="ml-2 text-muted-foreground">Loading form...</span>
        </div>
      )}
      <div
        ref={containerRef}
        className={showSpinner ? "hidden" : "block"}
      />
    </div>
  );
}
