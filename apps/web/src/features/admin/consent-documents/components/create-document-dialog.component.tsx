import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from "@repo/ui";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateConsentDocument } from "../data/consent-documents.mutations";

interface CreateDocumentDialogProps {
  trigger?: React.ReactNode;
  onCreated?: (doc: { id: string }) => void;
}

export function CreateDocumentDialog({
  trigger,
  onCreated,
}: CreateDocumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [orgUnitId, setOrgUnitId] = useState("");
  const [consentDocumentTypeId, setConsentDocumentTypeId] = useState("");

  const createMutation = useCreateConsentDocument();

  const reset = () => {
    setOrgUnitId("");
    setConsentDocumentTypeId("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) reset();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgUnitId.trim() || !consentDocumentTypeId.trim()) return;

    createMutation.mutate(
      {
        consentDocumentTypeId: consentDocumentTypeId.trim(),
        orgUnitId: orgUnitId.trim(),
      },
      {
        onSuccess: (result) => {
          toast.success("Document created");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Consent Document</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Org Unit ID</Label>
            <Input
              value={orgUnitId}
              onChange={(e) => setOrgUnitId(e.target.value)}
              placeholder="Enter org unit ID"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Document Type ID</Label>
            <Input
              value={consentDocumentTypeId}
              onChange={(e) => setConsentDocumentTypeId(e.target.value)}
              placeholder="Enter document type ID"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-bcgov-blue hover:bg-bcgov-blue/80"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating…" : "Create Document"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
