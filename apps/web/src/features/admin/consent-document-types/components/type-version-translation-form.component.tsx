import { Button, Input, Label, Textarea } from "@repo/ui";
import { useState } from "react";
import { toast } from "sonner";
import { useUpsertTypeVersionTranslation } from "../data/consent-document-types.mutations";
import type { ConsentDocumentTypeVersionTranslation } from "../data/consent-document-types.query";

interface TypeVersionTranslationFormProps {
  typeId: string;
  versionId: string;
  locale: string;
  translation?: ConsentDocumentTypeVersionTranslation;
  isDraft: boolean;
}

export function TypeVersionTranslationForm({
  typeId,
  versionId,
  locale,
  translation,
  isDraft,
}: TypeVersionTranslationFormProps) {
  const [name, setName] = useState(translation?.name ?? "");
  const [description, setDescription] = useState(
    translation?.description ?? "",
  );
  const [schemaStr, setSchemaStr] = useState(
    translation?.schema ? JSON.stringify(translation.schema, null, 2) : "{}",
  );
  const [uiSchemaStr, setUiSchemaStr] = useState(
    translation?.uiSchema
      ? JSON.stringify(translation.uiSchema, null, 2)
      : "{}",
  );

  const upsertMutation = useUpsertTypeVersionTranslation(typeId, versionId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let schema: Record<string, unknown>;
    let uiSchema: Record<string, unknown>;

    try {
      schema = JSON.parse(schemaStr) as Record<string, unknown>;
    } catch {
      toast.error("Invalid JSON in schema field");
      return;
    }

    try {
      uiSchema = JSON.parse(uiSchemaStr) as Record<string, unknown>;
    } catch {
      toast.error("Invalid JSON in uiSchema field");
      return;
    }

    upsertMutation.mutate(
      { locale, name, description, schema, uiSchema },
      {
        onSuccess: () => toast.success("Translation saved"),
        onError: (err) => toast.error(`Save failed: ${err.message}`),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!isDraft}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!isDraft}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Schema (JSON)</Label>
        <Textarea
          value={schemaStr}
          onChange={(e) => setSchemaStr(e.target.value)}
          disabled={!isDraft}
          rows={6}
          className="font-mono text-sm"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>UI Schema (JSON)</Label>
        <Textarea
          value={uiSchemaStr}
          onChange={(e) => setUiSchemaStr(e.target.value)}
          disabled={!isDraft}
          rows={6}
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
