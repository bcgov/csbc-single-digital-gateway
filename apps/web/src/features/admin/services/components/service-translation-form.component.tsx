import { JsonForms } from "@jsonforms/react";
import type { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { repoAjv, repoCells, repoRenderers } from "@repo/jsonforms";
import { Button, Input, Label, Textarea } from "@repo/ui";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  loadCategories,
  resolveCategory,
} from "../data/async-select-loaders";
import { useUpsertServiceTranslation } from "../data/services.mutations";
import type { ServiceVersionTranslation } from "../data/services.query";

const asyncSelectLoaders = {
  categories: {
    loadOptions: loadCategories,
    resolveValue: resolveCategory,
  },
};

interface ServiceTranslationFormProps {
  serviceId: string;
  versionId: string;
  locale: string;
  translation?: ServiceVersionTranslation;
  isDraft: boolean;
  contentSchema?: JsonSchema;
  contentUiSchema?: UISchemaElement;
}

export function ServiceTranslationForm({
  serviceId,
  versionId,
  locale,
  translation,
  isDraft,
  contentSchema,
  contentUiSchema,
}: ServiceTranslationFormProps) {
  const [nameValue, setNameValue] = useState(translation?.name ?? "");
  const [descriptionValue, setDescriptionValue] = useState(
    translation?.description ?? "",
  );
  const [contentData, setContentData] = useState<Record<string, unknown>>(
    (translation?.content as Record<string, unknown>) ?? {},
  );
  const [contentStr, setContentStr] = useState(
    translation?.content
      ? JSON.stringify(translation.content, null, 2)
      : "{}",
  );

  const upsertMutation = useUpsertServiceTranslation(serviceId, versionId);

  const hasSchema =
    contentSchema && Object.keys(contentSchema).length > 0;

  const jsonFormsConfig = useMemo(() => ({ asyncSelectLoaders }), []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let content: Record<string, unknown>;
    if (hasSchema) {
      content = contentData;
    } else {
      try {
        content = JSON.parse(contentStr) as Record<string, unknown>;
      } catch {
        toast.error("Invalid JSON in content field");
        return;
      }
    }

    if (!nameValue.trim()) {
      toast.error("Name is required");
      return;
    }

    upsertMutation.mutate(
      {
        locale,
        name: nameValue.trim(),
        description: descriptionValue.trim() || undefined,
        content,
      },
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
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          disabled={!isDraft}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Description</Label>
        <Textarea
          value={descriptionValue}
          onChange={(e) => setDescriptionValue(e.target.value)}
          disabled={!isDraft}
          rows={3}
        />
      </div>

      {hasSchema ? (
        <JsonForms
          schema={contentSchema}
          uischema={contentUiSchema}
          data={contentData}
          ajv={repoAjv}
          renderers={repoRenderers}
          cells={repoCells}
          config={jsonFormsConfig}
          readonly={!isDraft}
          onChange={({ data }) => setContentData(data)}
        />
      ) : (
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
      )}

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
