import { JsonForms } from "@jsonforms/react";
import type { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { repoAjv, repoCells, repoRenderers } from "@repo/jsonforms";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateDocumentType } from "../data/consent-document-types.mutations";

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
      options: { multi: true },
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

interface CreateDocumentTypeDialogProps {
  trigger?: React.ReactNode;
  onCreated?: (result: { id: string }) => void;
}

export function CreateDocumentTypeDialog({
  trigger,
  onCreated,
}: CreateDocumentTypeDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [resetKey, setResetKey] = useState(0);

  const createMutation = useCreateDocumentType();

  const reset = () => {
    setFormData({});
    setResetKey((k) => k + 1);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) reset();
  };

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

    createMutation.mutate(
      {
        name,
        description,
        schema: formData.schema as Record<string, unknown> | undefined,
        uiSchema: formData.uiSchema as Record<string, unknown> | undefined,
      },
      {
      onSuccess: (result) => {
        toast.success("Document type created");
        setOpen(false);
        reset();
        onCreated?.(result);
      },
      onError: (err) => {
        toast.error(`Failed to create: ${err.message}`);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Document Type (JSON Forms)</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            This will create a new document type with an initial draft version
            and English (en) translation.
          </p>

          <JsonForms
            key={resetKey}
            schema={schema}
            uischema={uiSchema}
            data={formData}
            ajv={repoAjv}
            renderers={repoRenderers}
            cells={repoCells}
            onChange={({ data }) => setFormData(data as Record<string, unknown>)}
          />

          <Button
            type="submit"
            className="w-full bg-bcgov-blue hover:bg-bcgov-blue/80"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create Document Type"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
