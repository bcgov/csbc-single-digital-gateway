import { useEffect, useState } from "react";
import type { ChefsScriptStatus } from "../types/chefs-form-viewer.types";

// Use PR-1802 preview for headers support
// TODO: Switch back to production once PR is merged
const CHEFS_SCRIPT_URL =
  "https://chefs-dev.apps.silver.devops.gov.bc.ca/pr-1802/embed/chefs-form-viewer.min.js";
const SCRIPT_ID = "chefs-form-viewer-script";

let globalStatus: ChefsScriptStatus = "idle";
const listeners = new Set<(status: ChefsScriptStatus) => void>();

function notifyListeners(status: ChefsScriptStatus) {
  globalStatus = status;
  listeners.forEach((listener) => listener(status));
}

function loadScript(): void {
  if (globalStatus === "loading" || globalStatus === "ready") {
    return;
  }

  if (document.getElementById(SCRIPT_ID)) {
    notifyListeners("ready");
    return;
  }

  notifyListeners("loading");

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = CHEFS_SCRIPT_URL;
  script.async = true;

  script.onload = () => {
    notifyListeners("ready");
  };

  script.onerror = () => {
    notifyListeners("error");
  };

  document.head.appendChild(script);
}

export function useChefsScript(): ChefsScriptStatus {
  const [status, setStatus] = useState<ChefsScriptStatus>(globalStatus);

  useEffect(() => {
    listeners.add(setStatus);
    loadScript();

    return () => {
      listeners.delete(setStatus);
    };
  }, []);

  return status;
}
