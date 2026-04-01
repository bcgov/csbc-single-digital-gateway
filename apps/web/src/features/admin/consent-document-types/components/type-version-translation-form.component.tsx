import type { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { JsonForms } from "@jsonforms/react";
import { repoAjv, repoCells, repoRenderers } from "@repo/jsonforms";
import { Button } from "@repo/ui";
import { useState } from "react";
import { toast } from "sonner";
import { useUpsertTypeVersionTranslation } from "../data/consent-document-types.mutations";
import type { ConsentDocumentTypeVersionTranslation } from "../data/consent-document-types.query";

const schema: JsonSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    description: { type: "string", minLength: 1 },
    schema: { type: "object" },
    uiSchema: { type: "object" },
  },
  required: ["name", "description"],
};

const uiSchema: UISchemaElement = {
  type: "VerticalLayout",
  elements: [
    { type: "Control", scope: "#/properties/name" },
    {
      type: "Control",
      scope: "#/properties/description",
      options: { height: "200px" },
    },
    {
      type: "Control",
      scope: "#/properties/schema",
      label: "JSON Schema",
      options: { format: "json", height: "200px" },
    },
    {
      type: "Control",
      scope: "#/properties/uiSchema",
      label: "UI Schema",
      options: { format: "json", height: "200px" },
    },
  ],
};

interface TypeVersionTranslationFormProps {
  typeId: string;
  versionId: string;
  locale: string;
  translation?: ConsentDocumentTypeVersionTranslation;
  isDraft: boolean;
}

function buildInitialData(
  translation?: ConsentDocumentTypeVersionTranslation,
): Record<string, unknown> {
  return {
    name: translation?.name ?? "",
    description: translation?.description ?? "",
    schema: translation?.schema ?? {},
    uiSchema: translation?.uiSchema ?? {},
  };
}

export function TypeVersionTranslationForm({
  typeId,
  versionId,
  locale,
  translation,
  isDraft,
}: TypeVersionTranslationFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(() =>
    buildInitialData(translation),
  );

  const upsertMutation = useUpsertTypeVersionTranslation(typeId, versionId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const name = formData.name;
    const description = formData.description;

    if (typeof name !== "string" || !name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (typeof description !== "string" || !description.trim()) {
      toast.error("Description is required");
      return;
    }

    upsertMutation.mutate(
      {
        locale,
        name,
        description,
        schema: formData.schema as Record<string, unknown> | undefined,
        uiSchema: formData.uiSchema as Record<string, unknown> | undefined,
      },
      {
        onSuccess: () => toast.success("Translation saved"),
        onError: (err) => toast.error(`Save failed: ${err.message}`),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <JsonForms
        schema={schema}
        uischema={uiSchema}
        data={formData}
        ajv={repoAjv}
        renderers={repoRenderers}
        cells={repoCells}
        readonly={!isDraft}
        onChange={({ data }) => setFormData(data as Record<string, unknown>)}
      />

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
