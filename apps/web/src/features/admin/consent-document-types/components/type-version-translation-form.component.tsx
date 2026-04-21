import type { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { JsonForms } from "@jsonforms/react";
import { repoAjv, repoCells, repoRenderers } from "@repo/jsonforms";
import { Button } from "@repo/ui";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { openStudio } from "../../jsonforms-studio/util/launcher";
import { useUpsertTypeVersionTranslation } from "../data/consent-document-types.mutations";
import type { ConsentDocumentTypeVersionTranslation } from "../data/consent-document-types.query";

const metaSchema: JsonSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    description: { type: "string", minLength: 1 },
  },
  required: ["name", "description"],
};

const metaUiSchema: UISchemaElement = {
  type: "VerticalLayout",
  elements: [
    { type: "Control", scope: "#/properties/name" },
    {
      type: "Control",
      scope: "#/properties/description",
      options: { height: "200px" },
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

interface FormState {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  uiSchema: Record<string, unknown>;
}

function buildInitialData(
  translation?: ConsentDocumentTypeVersionTranslation,
): FormState {
  return {
    name: translation?.name ?? "",
    description: translation?.description ?? "",
    schema: (translation?.schema as Record<string, unknown> | undefined) ?? {},
    uiSchema: (translation?.uiSchema as Record<string, unknown> | undefined) ?? {},
  };
}

export function TypeVersionTranslationForm({
  typeId,
  versionId,
  locale,
  translation,
  isDraft,
}: TypeVersionTranslationFormProps) {
  const [formData, setFormData] = useState<FormState>(() =>
    buildInitialData(translation),
  );
  const detachRef = useRef<(() => void) | null>(null);

  useEffect(() => () => detachRef.current?.(), []);

  const upsertMutation = useUpsertTypeVersionTranslation(typeId, versionId);

  const handleOpenStudio = () => {
    detachRef.current?.();
    detachRef.current = openStudio({
      schema: formData.schema,
      uiSchema: formData.uiSchema,
      readonly: !isDraft,
      onApply: ({ schema, uiSchema }) => {
        setFormData((prev) => ({ ...prev, schema, uiSchema }));
        toast.success("Form definition updated from Studio");
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }
    upsertMutation.mutate(
      {
        locale,
        name: formData.name,
        description: formData.description,
        schema: formData.schema,
        uiSchema: formData.uiSchema,
      },
      {
        onSuccess: () => toast.success("Translation saved"),
        onError: (err) => toast.error(`Save failed: ${err.message}`),
      },
    );
  };

  const previewSchema = formData.schema as Record<string, unknown>;
  const previewUi = formData.uiSchema as unknown as UISchemaElement;
  const hasPreview =
    Object.keys(previewSchema).length > 0 ||
    (previewUi && Object.keys(previewUi as unknown as Record<string, unknown>).length > 0);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <JsonForms
        schema={metaSchema}
        uischema={metaUiSchema}
        data={{ name: formData.name, description: formData.description }}
        ajv={repoAjv}
        renderers={repoRenderers}
        cells={repoCells}
        readonly={!isDraft}
        onChange={({ data }) => {
          const next = data as { name?: string; description?: string };
          setFormData((prev) => ({
            ...prev,
            name: next.name ?? "",
            description: next.description ?? "",
          }));
        }}
      />

      <div className="flex flex-col gap-2 rounded border border-border p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Form definition</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenStudio}
          >
            {isDraft ? "Open in Studio" : "View in Studio"}
          </Button>
        </div>
        {hasPreview ? (
          <div className="rounded bg-muted/30 p-3">
            <JsonForms
              schema={previewSchema}
              uischema={previewUi}
              data={{}}
              ajv={repoAjv}
              renderers={repoRenderers}
              cells={repoCells}
              readonly
              onChange={() => {}}
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No form definition yet. Open the Studio to build one.
          </p>
        )}
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
