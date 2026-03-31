import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Textarea,
} from "@repo/ui";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateDocumentType } from "../data/consent-document-types.mutations";

interface CreateDocumentTypeDialogProps {
  trigger?: React.ReactNode;
  onCreated?: (result: { id: string }) => void;
}

export function CreateDocumentTypeDialog({
  trigger,
  onCreated,
}: CreateDocumentTypeDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schemaStr, setSchemaStr] = useState("{}");
  const [uiSchemaStr, setUiSchemaStr] = useState("{}");

  const createMutation = useCreateDocumentType();

  const reset = () => {
    setName("");
    setDescription("");
    setSchemaStr("{}");
    setUiSchemaStr("{}");
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) reset();
  };

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

    createMutation.mutate(
      { name, description, schema, uiSchema },
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
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Document Type</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            This will create a new document type with an initial draft version
            and English (en) translation.
          </p>

          <div className="flex flex-col gap-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Privacy Consent"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this consent document type…"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Schema (JSON)</Label>
            <Textarea
              value={schemaStr}
              onChange={(e) => setSchemaStr(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>UI Schema (JSON)</Label>
            <Textarea
              value={uiSchemaStr}
              onChange={(e) => setUiSchemaStr(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
          </div>

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
