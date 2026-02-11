import { useMutation } from "@tanstack/react-query";
import { consentManagerApi } from "../../../api/consent-manager-api.client";
import type { ConsentDocumentDto } from "../consent-document.dto";

interface ConsentStatementEntry {
  document: ConsentDocumentDto;
  status: "granted" | "revoked";
}

export function useCreateConsentStatements() {
  return useMutation({
    mutationFn: (entries: ConsentStatementEntry[]) =>
      Promise.all(
        entries.map(({ document: doc, status }) =>
          consentManagerApi.post("/api/v1/statements", {
            documentId: doc.id,
            versionId: doc.versionId,
            status,
          }),
        ),
      ),
  });
}
