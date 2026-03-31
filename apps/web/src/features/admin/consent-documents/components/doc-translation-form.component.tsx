import { Button, Label, Textarea } from "@repo/ui";
import { useState } from "react";
import { toast } from "sonner";
import { useUpsertDocTranslation } from "../data/consent-documents.mutations";
import type { ConsentDocumentVersionTranslation } from "../data/consent-documents.query";

interface DocTranslationFormProps {
  docId: string;
  versionId: string;
  locale: string;
  translation?: ConsentDocumentVersionTranslation;
  isDraft: boolean;
}

export function DocTranslationForm({
  docId,
  versionId,
  locale,
  translation,
  isDraft,
}: DocTranslationFormProps) {
  const [contentStr, setContentStr] = useState(
    translation?.content
      ? JSON.stringify(translation.content, null, 2)
      : "{}",
  );

  const upsertMutation = useUpsertDocTranslation(docId, versionId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let content: Record<string, unknown>;
    try {
      content = JSON.parse(contentStr) as Record<string, unknown>;
    } catch {
      toast.error("Invalid JSON in content field");
      return;
    }

    upsertMutation.mutate(
      { locale, content },
      {
        onSuccess: () => toast.success("Translation saved"),
        onError: (err) => toast.error(`Save failed: ${err.message}`),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Content (JSON)</Label>
        <Textarea
          value={contentStr}
          onChange={(e) => setContentStr(e.target.value)}
          disabled={!isDraft}
          rows={10}
          className="font-mono text-sm"
        />
      </div>

      {isDraft && (
        <Button
          type="submit"
          className="w-full bg-bcgov-blue hover:bg-bcgov-blue/80"
          disabled={upsertMutation.isPending}
        >
          {upsertMutation.isPending ? "Saving…" : "Save Translation"}
        </Button>
      )}
    </form>
  );
}
